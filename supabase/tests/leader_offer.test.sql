-- The leader offer columns (20261113_leader_offer.sql): what the educator sends
-- is bounded, an offer reference finds at most one check, and neither table is
-- reachable by the public keys.

do $$
declare
  checks integer := 0;
  owner_id uuid := gen_random_uuid();
  story_id uuid;
  ok boolean;
begin
  insert into auth.users (id) values (owner_id);
  insert into public.profiles (id) values (owner_id);
  insert into public.stories (user_id) values (owner_id) returning id into story_id;

  -- 1. A new check sends no numbers unless the educator ticked the box.
  insert into public.story_checks (story_id, user_id, token_hash, expires_at) values (story_id, owner_id, 'test-hash-1', now() + interval '14 days');
  assert (select share_counts from public.story_checks where token_hash = 'test-hash-1') = false, '1 share_counts must default to false';
  checks := checks + 1;

  -- 2. A centre name over 80 characters is refused.
  ok := false;
  begin
    update public.story_checks set centre_name = repeat('a', 81) where token_hash = 'test-hash-1';
  exception when check_violation then ok := true;
  end;
  assert ok, '2 a centre name over 80 characters must be refused';
  checks := checks + 1;
  update public.story_checks set centre_name = repeat('a', 80) where token_hash = 'test-hash-1';
  assert (select char_length(centre_name) from public.story_checks where token_hash = 'test-hash-1') = 80, '3 80 characters is allowed';
  checks := checks + 1;

  -- 4. One offer reference, one check.
  update public.story_checks set offer_ref_hash = 'test-offer-1' where token_hash = 'test-hash-1';
  insert into public.story_checks (story_id, user_id, token_hash, expires_at) values (story_id, owner_id, 'test-hash-2', now() + interval '14 days');
  ok := false;
  begin
    update public.story_checks set offer_ref_hash = 'test-offer-1' where token_hash = 'test-hash-2';
  exception when unique_violation then ok := true;
  end;
  assert ok, '4 two checks must never share an offer reference';
  checks := checks + 1;

  -- 5. Many checks may have no offer reference (rows from before this migration).
  insert into public.story_checks (story_id, user_id, token_hash, expires_at) values (story_id, owner_id, 'test-hash-3', now() + interval '14 days');
  assert (select count(*) from public.story_checks where offer_ref_hash is null and token_hash like 'test-hash-%') = 2, '5 checks without a reference must coexist';
  checks := checks + 1;

  -- 6-7. Still service-role only: RLS on, no policies, no grants for the public roles.
  assert (select relrowsecurity from pg_class where oid = 'public.story_checks'::regclass), '6 story_checks must keep row level security';
  assert not exists (select 1 from pg_policies where tablename in ('story_checks', 'centre_invites')), '6 there must be no policies';
  checks := checks + 1;
  assert not has_table_privilege('anon', 'public.story_checks', 'select') and not has_table_privilege('authenticated', 'public.story_checks', 'select')
     and not has_table_privilege('anon', 'public.centre_invites', 'select') and not has_table_privilege('authenticated', 'public.centre_invites', 'select'),
    '7 the public roles must not read either table';
  checks := checks + 1;

  -- 8. An ordinary invitation is not marked as one from a leader's offer.
  assert (select column_default from information_schema.columns where table_name = 'centre_invites' and column_name = 'from_leader_offer') = 'false',
    '8 from_leader_offer must default to false';
  checks := checks + 1;

  delete from public.story_checks where token_hash like 'test-hash-%';
  delete from public.stories where user_id = owner_id;
  delete from public.profiles where id = owner_id;
  delete from auth.users where id = owner_id;
  raise notice 'all % checks passed', checks;
end $$;
