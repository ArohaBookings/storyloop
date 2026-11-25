-- The leader stop list (20261126_leader_stop_list.sql): one row per hash,
-- and the public keys cannot read or write it.

do $$
begin
  insert into public.leader_stop_list (recipient_hash) values ('stop-h1');
  insert into public.leader_stop_list (recipient_hash) values ('stop-h1') on conflict (recipient_hash) do nothing;
  assert (select count(*) from public.leader_stop_list where recipient_hash = 'stop-h1') = 1, '1 one row per hash';
  assert (select relrowsecurity from pg_class where oid = 'public.leader_stop_list'::regclass), '2 row level security must be on';
  assert not exists (select 1 from pg_policies where tablename = 'leader_stop_list'), '3 there must be no policies';
  assert not has_table_privilege('anon', 'public.leader_stop_list', 'select')
     and not has_table_privilege('authenticated', 'public.leader_stop_list', 'select')
     and not has_table_privilege('anon', 'public.leader_stop_list', 'insert'), '4 no access for the public keys';
  delete from public.leader_stop_list where recipient_hash = 'stop-h1';
  raise notice 'leader_stop_list: 4 checks passed';
end $$;
