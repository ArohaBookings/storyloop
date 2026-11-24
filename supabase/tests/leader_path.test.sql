-- The leader path tables (20261125_leader_path.sql): new choices default off,
-- a set holds at most 30 pieces, an email belongs to exactly one check or set,
-- and none of the new tables is reachable by the public keys.

do $$
declare
  checks integer := 0;
  owner_id uuid := gen_random_uuid();
  story_id uuid;
  v_check uuid;
  v_set uuid;
  ok boolean;
begin
  insert into auth.users (id) values (owner_id);
  insert into public.profiles (id) values (owner_id);
  insert into public.stories (user_id) values (owner_id) returning id into story_id;

  -- 1. A story check made the old way has both new choices off.
  insert into public.story_checks (story_id, user_id, token_hash, expires_at)
    values (story_id, owner_id, 'lp-check-1', now() + interval '14 days') returning id into v_check;
  assert (select not join_consent and not show_sources from public.story_checks where id = v_check), '1 join_consent and show_sources must default to false';
  checks := checks + 1;

  -- 2. A set starts as sent, with both choices off.
  insert into public.leader_sets (user_id, token_hash, expires_at)
    values (owner_id, 'lp-set-1', now() + interval '14 days') returning id into v_set;
  assert (select status = 'sent' and not join_consent and not show_sources from public.leader_sets where id = v_set), '2 a new set must be sent with both choices off';
  checks := checks + 1;

  -- 3. Positions run 1 to 30, once each.
  insert into public.leader_set_items (set_id, position, mode, framework) values (v_set, 1, 'transition', 'te-whariki');
  insert into public.leader_set_items (set_id, position, mode, framework) values (v_set, 30, 'summary', 'eylf');
  ok := false;
  begin
    insert into public.leader_set_items (set_id, position, mode, framework) values (v_set, 31, 'summary', 'eylf');
  exception when check_violation then ok := true;
  end;
  assert ok, '3 a 31st piece must be refused';
  checks := checks + 1;
  ok := false;
  begin
    insert into public.leader_set_items (set_id, position, mode, framework) values (v_set, 1, 'summary', 'eylf');
  exception when unique_violation then ok := true;
  end;
  assert ok, '4 two pieces must never share a position';
  checks := checks + 1;

  -- 5. An email belongs to exactly one check or one set.
  ok := false;
  begin
    insert into public.leader_emails (user_id, recipient_hash) values (owner_id, 'h');
  exception when check_violation then ok := true;
  end;
  assert ok, '5 an email with neither a check nor a set must be refused';
  checks := checks + 1;
  ok := false;
  begin
    insert into public.leader_emails (user_id, check_id, set_id, recipient_hash) values (owner_id, v_check, v_set, 'h');
  exception when check_violation then ok := true;
  end;
  assert ok, '6 an email with both a check and a set must be refused';
  checks := checks + 1;

  -- 7. One email per check.
  insert into public.leader_emails (user_id, check_id, recipient_hash) values (owner_id, v_check, 'h');
  ok := false;
  begin
    insert into public.leader_emails (user_id, check_id, recipient_hash) values (owner_id, v_check, 'h');
  exception when unique_violation then ok := true;
  end;
  assert ok, '7 a check must have at most one email row';
  checks := checks + 1;

  -- 8. Deleting the set removes its pieces and its email.
  insert into public.leader_emails (user_id, set_id, recipient_hash) values (owner_id, v_set, 'h');
  delete from public.leader_sets where id = v_set;
  assert not exists (select 1 from public.leader_set_items i where i.set_id = v_set), '8 pieces must go with their set';
  assert not exists (select 1 from public.leader_emails e where e.set_id = v_set), '8 the email must go with its set';
  checks := checks + 1;

  -- 9-10. Service role only: RLS on, no policies, no grants for the public roles.
  assert (select bool_and(relrowsecurity) from pg_class where oid in ('public.leader_sets'::regclass, 'public.leader_set_items'::regclass, 'public.leader_emails'::regclass)),
    '9 every new table must have row level security';
  assert not exists (select 1 from pg_policies where tablename in ('leader_sets', 'leader_set_items', 'leader_emails')), '9 there must be no policies';
  checks := checks + 1;
  assert not has_table_privilege('anon', 'public.leader_sets', 'select') and not has_table_privilege('authenticated', 'public.leader_sets', 'select')
     and not has_table_privilege('anon', 'public.leader_set_items', 'select') and not has_table_privilege('authenticated', 'public.leader_set_items', 'select')
     and not has_table_privilege('anon', 'public.leader_emails', 'insert') and not has_table_privilege('authenticated', 'public.leader_emails', 'select'),
    '10 the public roles must not reach any new table';
  checks := checks + 1;

  delete from public.leader_emails where user_id = owner_id;
  delete from public.story_checks where token_hash like 'lp-check-%';
  delete from public.stories where user_id = owner_id;
  delete from public.profiles where id = owner_id;
  delete from auth.users where id = owner_id;
  raise notice 'all % checks passed', checks;
end $$;
