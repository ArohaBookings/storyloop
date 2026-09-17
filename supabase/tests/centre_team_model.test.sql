-- Centre team model: what the schema must refuse, and what the activity RPC
-- must never reveal. There is no row level security in this database, so these
-- constraints are the only structural protection behind lib/centres.ts.

do $$
declare
  u_owner uuid; u_edu uuid; u_other uuid; c1 uuid; c2 uuid; n int;
begin
  delete from public.centre_invites;
  delete from public.centre_members;
  delete from public.centres;
  delete from public.stories;
  delete from public.profiles;
  delete from auth.users;

  insert into auth.users default values returning id into u_owner;
  insert into auth.users default values returning id into u_edu;
  insert into auth.users default values returning id into u_other;
  insert into public.profiles (id, email, full_name, total_stories) values
    (u_owner, 'owner@centre.nz', 'Owner', 5),
    (u_edu, 'edu@centre.nz', 'Educator', 3),
    (u_other, 'other@centre.nz', 'Other', 0);
  -- A planted story naming a child. It must never appear in activity output.
  insert into public.stories (user_id, content) values (u_edu, 'SECRET CHILD STORY TEXT about Aroha');

  insert into public.centres (name, created_by) values ('Centre One', u_owner) returning id into c1;
  insert into public.centres (name, created_by) values ('Centre Two', u_other) returning id into c2;

  insert into public.centre_members (centre_id, user_id, role) values (c1, u_edu, 'educator');
  assert (select shares_stories from public.centre_members where user_id = u_edu) = false,
    '1 consent must default to false';

  begin
    insert into public.centre_members (centre_id, user_id) values (c2, u_edu);
    raise exception '2 FAIL: an educator joined two centres';
  exception when unique_violation then null;
  end;

  update public.centre_members set status = 'removed' where user_id = u_edu and centre_id = c1;
  insert into public.centre_members (centre_id, user_id) values (c2, u_edu);
  delete from public.centre_members where centre_id = c2 and user_id = u_edu;
  update public.centre_members set status = 'active' where user_id = u_edu and centre_id = c1;

  begin
    insert into public.centre_members (centre_id, user_id, role) values (c1, u_other, 'superadmin');
    raise exception '4 FAIL: an invalid role was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.centre_members (centre_id, user_id, status) values (c1, u_other, 'pending');
    raise exception '5 FAIL: an invalid status was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.centres (name, seat_limit) values ('Zero seats', 0);
    raise exception '6 FAIL: a centre with zero seats was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.centre_invites (centre_id, email, role, token, expires_at)
      values (c1, 'x@y.nz', 'owner', 'tok-owner', now() + interval '1 day');
    raise exception '7 FAIL: an invite granted the owner role';
  exception when check_violation then null;
  end;

  insert into public.centre_invites (centre_id, email, token, expires_at) values (c1, 'a@b.nz', 'tok-dup', now() + interval '1 day');
  begin
    insert into public.centre_invites (centre_id, email, token, expires_at) values (c1, 'd@e.nz', 'tok-dup', now() + interval '1 day');
    raise exception '8 FAIL: a duplicate invite token was accepted';
  exception when unique_violation then null;
  end;

  select count(*) into n from public.centre_activity(c1);
  assert n = 1, format('9 expected 1 active member, got %s', n);
  assert not exists (
    select 1 from public.centre_activity(c1) a
    where a::text ilike '%SECRET CHILD STORY TEXT%' or a::text ilike '%Aroha%'
  ), '10 FAIL: story content leaked through centre_activity';
  assert (select stories_30d from public.centre_activity(c1) where user_id = u_edu) = 1, '11 stories_30d count wrong';
  assert not exists (select 1 from public.centre_activity(c2) where user_id = u_edu),
    '12 FAIL: one centre can see another centre''s member';

  update public.centres set updated_at = '2000-01-01' where id = c1;
  update public.centres set name = 'Centre One Renamed' where id = c1;
  assert (select updated_at from public.centres where id = c1) > '2020-01-01', '13 updated_at trigger did not fire';

  assert not has_function_privilege('anon', 'public.centre_activity(uuid)', 'execute'), '14 FAIL: anon can call centre_activity';
  assert not has_function_privilege('authenticated', 'public.centre_activity(uuid)', 'execute'), '15 FAIL: authenticated can call centre_activity';
  assert has_function_privilege('service_role', 'public.centre_activity(uuid)', 'execute'), '16 service_role cannot call centre_activity';

  raise notice 'centre_team_model: all 16 checks passed';
end $$;
