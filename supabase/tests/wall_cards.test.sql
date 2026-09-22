-- Proves the wall card boundary at the database, where it actually has to hold.
-- A wall code is printed in a building the public walks through, so these are
-- the guarantees that survive every application bug above them.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.profiles (id, email, plan) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'mine@example.nz', 'educator'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other@example.nz', 'educator')
on conflict (id) do update set plan = 'educator';

delete from public.wall_cards where code like 'TEST%';

insert into public.wall_cards (user_id, code, card, scrub_report, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TESTLIVE01',
   '{"heading":"What was happening here","body":["The water travelled down the pipe."]}',
   '{"findings":[{"term":"Ruby","action":"removed"}]}', 'published'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TESTDRAFT1',
   '{"heading":"Draft"}', '{}', 'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TESTREVOKE',
   '{"heading":"Revoked"}', '{}', 'revoked');

update public.wall_cards set expires_at = now() - interval '1 day'
 where code = 'TESTLIVE01' and false; -- placeholder, expiry tested separately below

insert into public.wall_cards (user_id, code, card, status, expires_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'TESTEXPIRE',
        '{"heading":"Expired"}', 'published', now() - interval '1 day');

create or replace function pg_temp.as_user(uid text, stmt text) returns text language plpgsql as $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  execute stmt;
  reset role;
  return 'allowed';
exception when insufficient_privilege then
  reset role;
  return 'refused';
end $$;

create or replace function pg_temp.rows_seen(uid text) returns integer language plpgsql as $$
declare n integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  select count(*) into n from public.wall_cards where code like 'TEST%';
  reset role;
  return n;
end $$;

do $$
declare
  mine constant text := 'aaaaaaaa-0000-0000-0000-000000000001';
  other constant text := 'bbbbbbbb-0000-0000-0000-000000000002';
  checks integer := 0;
  n integer;
  r text;
  before_count integer;
  after_count integer;
begin
  -- 1. An educator sees their own cards.
  n := pg_temp.rows_seen(mine);
  assert n = 4, '1 owner must see their own 4 cards, saw ' || n;
  checks := checks + 1;

  -- 2. Another educator sees NONE of them, including the published one.
  n := pg_temp.rows_seen(other);
  assert n = 0, '2 another educator must see no cards of mine, saw ' || n;
  checks := checks + 1;

  -- 3. Nobody can write a card onto somebody else's account.
  r := pg_temp.as_user(other,
    'insert into public.wall_cards (user_id, code, card) values (''aaaaaaaa-0000-0000-0000-000000000001'', ''TESTEVIL01'', ''{}'')');
  assert r = 'refused', '3 writing a card as another user must be refused: ' || r;
  checks := checks + 1;

  -- 4. The scan counter is not callable by the roles a browser can reach.
  assert not has_function_privilege('authenticated', 'public.count_wall_card_scan(text)', 'execute'),
    '4 authenticated must not execute the scan counter';
  assert not has_function_privilege('anon', 'public.count_wall_card_scan(text)', 'execute'),
    '4 anon must not execute the scan counter';
  checks := checks + 1;

  -- 5. Counting a scan works for a live card.
  select scan_count into before_count from public.wall_cards where code = 'TESTLIVE01';
  perform public.count_wall_card_scan('TESTLIVE01');
  select scan_count into after_count from public.wall_cards where code = 'TESTLIVE01';
  assert after_count = before_count + 1, '5 a live card must count its scan';
  checks := checks + 1;

  -- 6. A draft, a revoked card and an expired card never count a scan, which
  --    means they are never being served either.
  foreach r in array array['TESTDRAFT1', 'TESTREVOKE', 'TESTEXPIRE'] loop
    select scan_count into before_count from public.wall_cards where code = r;
    perform public.count_wall_card_scan(r);
    select scan_count into after_count from public.wall_cards where code = r;
    assert after_count = before_count, '6 ' || r || ' must not count a scan';
  end loop;
  checks := checks + 1;

  -- 7. An unknown code is silent: no error, no row, nothing to enumerate with.
  perform public.count_wall_card_scan('TESTNOSUCH');
  checks := checks + 1;

  -- 8. Codes are unique, so one cannot be squatted or shadowed.
  begin
    insert into public.wall_cards (user_id, code, card)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 'TESTLIVE01', '{}');
    assert false, '8 a duplicate code must be rejected';
  exception when unique_violation then
    null;
  end;
  checks := checks + 1;

  -- 9. The scrub report, which names removed children, is a separate column
  --    from the public payload. This is the structural guarantee.
  assert (select card::text from public.wall_cards where code = 'TESTLIVE01') not like '%Ruby%',
    '9 the public payload must not contain a removed name';
  assert (select scrub_report::text from public.wall_cards where code = 'TESTLIVE01') like '%Ruby%',
    '9 the educator report must still record what was removed';
  checks := checks + 1;

  -- 10. Deleting the account takes the cards with it.
  assert (select count(*) from information_schema.referential_constraints rc
           join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
          where k.table_name = 'wall_cards' and k.column_name = 'user_id'
            and rc.delete_rule = 'CASCADE') = 1,
    '10 wall cards must be deleted with the account';
  checks := checks + 1;

  raise notice 'all % checks passed', checks;
end $$;

delete from public.wall_cards where code like 'TEST%';
