-- Consent, enforced where it cannot be forgotten.
--
-- Application code checks consent too, but consent for recording a three-year-
-- old is the kind of rule that must survive a future code path nobody has
-- written yet, so the database refuses as well.

insert into auth.users (id) values
  ('cccccccc-0000-0000-0000-000000000001'),
  ('dddddddd-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.profiles (id, email, plan) values
  ('cccccccc-0000-0000-0000-000000000001', 'kaiako@example.nz', 'educator'),
  ('dddddddd-0000-0000-0000-000000000002', 'other@example.nz', 'educator')
on conflict (id) do update set plan = 'educator';

delete from public.child_voice_notes where words like 'TEST %';
delete from public.child_profiles where name in ('Consented Child', 'Unconsented Child', 'Other Educators Child');

insert into public.child_profiles (id, user_id, name, voice_consent_at) values
  ('11111111-aaaa-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'Consented Child', now()),
  ('22222222-aaaa-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'Unconsented Child', null),
  ('33333333-aaaa-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000002', 'Other Educators Child', now());

create or replace function pg_temp.try_insert(uid text, child text, words text) returns text language plpgsql as $$
begin
  insert into public.child_voice_notes (user_id, child_id, words) values (uid::uuid, child::uuid, words);
  return 'allowed';
exception
  when insufficient_privilege then return 'refused';
  when check_violation then return 'refused_check';
  when others then return 'refused_other:' || SQLERRM;
end $$;

create or replace function pg_temp.rows_seen(uid text) returns integer language plpgsql as $$
declare n integer;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  select count(*) into n from public.child_voice_notes where words like 'TEST %';
  reset role;
  return n;
end $$;

do $$
declare
  me constant text := 'cccccccc-0000-0000-0000-000000000001';
  other constant text := 'dddddddd-0000-0000-0000-000000000002';
  consented constant text := '11111111-aaaa-0000-0000-000000000001';
  unconsented constant text := '22222222-aaaa-0000-0000-000000000002';
  theirs constant text := '33333333-aaaa-0000-0000-000000000003';
  checks integer := 0;
  r text;
  n integer;
begin
  -- 1. No recorded family consent, no note. Ever.
  r := pg_temp.try_insert(me, unconsented, 'TEST i builded a tower');
  assert r like 'refused%', '1 a note without consent must be refused, got: ' || r;
  checks := checks + 1;

  -- 2. With consent it works, and the child's words survive verbatim.
  r := pg_temp.try_insert(me, consented, 'TEST i builded a tower and it dint fall');
  assert r = 'allowed', '2 a consented note must be allowed, got: ' || r;
  assert exists (select 1 from public.child_voice_notes where words = 'TEST i builded a tower and it dint fall'),
    '2 the words must be stored exactly as given';
  checks := checks + 1;

  -- 3. An educator cannot attach a note to a child who is not theirs, even
  --    though that child's family HAS consented for their own educator.
  r := pg_temp.try_insert(me, theirs, 'TEST not my child');
  assert r like 'refused%', '3 a note on another educator''s child must be refused, got: ' || r;
  checks := checks + 1;

  -- 4. There is nowhere to put audio. This asserts the design, so that adding
  --    an audio column later has to be a deliberate act with its own thinking.
  assert not exists (
    select 1 from information_schema.columns
     where table_name = 'child_voice_notes'
       and (column_name like '%audio%' or column_name like '%recording%' or column_name like '%voice_file%')
  ), '4 child_voice_notes must have no audio column';
  checks := checks + 1;

  -- 5. Provenance cannot be invented.
  begin
    insert into public.child_voice_notes (user_id, child_id, words, provenance)
    values (me::uuid, consented::uuid, 'TEST bad provenance', 'verbatim_guaranteed');
    assert false, '5 an unknown provenance must be rejected';
  exception when check_violation then null;
  end;
  checks := checks + 1;

  -- 6. Empty words are not a record of anything.
  begin
    insert into public.child_voice_notes (user_id, child_id, words) values (me::uuid, consented::uuid, '   ');
    assert false, '6 blank words must be rejected';
  exception when check_violation then null;
  end;
  checks := checks + 1;

  -- 7. RLS: another educator sees none of it.
  n := pg_temp.rows_seen(me);
  assert n >= 1, '7 the owning educator must see their own notes, saw ' || n;
  n := pg_temp.rows_seen(other);
  assert n = 0, '7 another educator must see none of my notes, saw ' || n;
  checks := checks + 1;

  -- 8. WITHDRAWING CONSENT REMOVES WHAT WAS COLLECTED UNDER IT.
  --    A family that says "actually, no" should not have to ask twice.
  update public.child_profiles set voice_consent_at = null where id = consented::uuid;
  assert not exists (select 1 from public.child_voice_notes where child_id = consented::uuid),
    '8 withdrawing consent must delete the notes collected under it';
  checks := checks + 1;

  -- 9. And once withdrawn, nothing new can be added.
  r := pg_temp.try_insert(me, consented, 'TEST after withdrawal');
  assert r like 'refused%', '9 after withdrawal, new notes must be refused, got: ' || r;
  checks := checks + 1;

  -- 10. Deleting the child, or the account, takes the notes with them.
  assert (select count(*) from information_schema.referential_constraints rc
           join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
          where k.table_name = 'child_voice_notes' and k.column_name in ('child_id', 'user_id')
            and rc.delete_rule = 'CASCADE') = 2,
    '10 notes must be deleted with the child and with the account';
  checks := checks + 1;

  raise notice 'all % checks passed', checks;
end $$;

delete from public.child_voice_notes where words like 'TEST %';
delete from public.child_profiles where name in ('Consented Child', 'Unconsented Child', 'Other Educators Child');
