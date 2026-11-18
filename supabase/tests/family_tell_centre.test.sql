-- Tell your centre (20261119_family_tell_centre.sql): the switch on a family
-- link starts off, holds only true or false, and the table is still out of
-- reach of the public keys.

do $$
declare
  checks integer := 0;
  educator uuid := gen_random_uuid();
  kid uuid;
  link uuid;
  ok boolean;
begin
  insert into auth.users (id) values (educator);
  insert into public.profiles (id) values (educator);
  insert into public.child_profiles (user_id, name) values (educator, 'Mia') returning id into kid;

  -- 1. A new link is off.
  insert into public.family_links (user_id, child_id, label, token_hash, expires_at)
    values (educator, kid, 'Mum', 'tell-centre-test-hash', now() + interval '400 days') returning id into link;
  assert (select tell_centre from public.family_links where id = link) = false, '1 a new link must start with tell_centre off';
  checks := checks + 1;

  -- 2. It can be switched on and off.
  update public.family_links set tell_centre = true where id = link;
  assert (select tell_centre from public.family_links where id = link), '2 the educator can switch it on';
  update public.family_links set tell_centre = false where id = link;
  assert not (select tell_centre from public.family_links where id = link), '2 and off again';
  checks := checks + 1;

  -- 3. Never unknown: null is refused.
  ok := false;
  begin
    update public.family_links set tell_centre = null where id = link;
  exception when not_null_violation then ok := true;
  end;
  assert ok, '3 tell_centre must never be null';
  checks := checks + 1;

  -- 4-5. Still service-role only: RLS on, no policies, no grants for the public roles.
  assert (select relrowsecurity from pg_class where oid = 'public.family_links'::regclass), '4 family_links must keep row level security';
  assert not exists (select 1 from pg_policies where tablename = 'family_links'), '4 there must be no policies';
  checks := checks + 1;
  assert not has_table_privilege('anon', 'public.family_links', 'select') and not has_table_privilege('authenticated', 'public.family_links', 'update'),
    '5 the public roles must not read or change a link';
  checks := checks + 1;

  -- Leave nothing behind for the next test file.
  delete from public.family_links where id = link;
  delete from public.child_profiles where id = kid;
  delete from public.profiles where id = educator;
  delete from auth.users where id = educator;

  raise notice 'all % checks passed', checks;
end $$;
