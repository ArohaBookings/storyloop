-- The team review queue and the centre child list (20261118_centre_team_review.sql):
-- what the schema refuses, and that no client role can reach the new tables.

do $$
declare
  checks integer := 0;
  u_owner uuid := gen_random_uuid();
  u_edu uuid := gen_random_uuid();
  c1 uuid;
  s1 uuid;
  kid1 uuid;
  kid2 uuid;
  cc uuid;
  ok boolean;
begin
  insert into auth.users (id) values (u_owner), (u_edu);
  insert into public.profiles (id, email, full_name) values (u_owner, 'owner@team.nz', 'Owner'), (u_edu, 'edu@team.nz', 'Educator');
  insert into public.centres (name, created_by) values ('Team Centre', u_owner) returning id into c1;
  insert into public.stories (user_id, content) values (u_edu, 'A story about Mia') returning id into s1;
  insert into public.child_profiles (user_id, name) values (u_edu, 'Mia') returning id into kid1;
  insert into public.child_profiles (user_id, name) values (u_owner, 'Mia') returning id into kid2;

  -- 1. "Looks good" carries no note.
  insert into public.centre_story_reviews (centre_id, story_id, author_id, reviewer_id, status) values (c1, s1, u_edu, u_owner, 'looks_good');
  checks := checks + 1;

  -- 2. One answer per story per centre.
  ok := false;
  begin
    insert into public.centre_story_reviews (centre_id, story_id, author_id, reviewer_id, status, note) values (c1, s1, u_edu, u_owner, 'note', 'Second answer');
  exception when unique_violation then ok := true;
  end;
  assert ok, '2 a story must have one answer per centre';
  checks := checks + 1;

  -- 3. A note needs words.
  ok := false;
  begin
    update public.centre_story_reviews set status = 'note', note = '   ' where story_id = s1;
  exception when check_violation then ok := true;
  end;
  assert ok, '3 an empty note must be refused';
  checks := checks + 1;

  -- 4. "Looks good" with words is refused (the words belong in a note).
  ok := false;
  begin
    update public.centre_story_reviews set note = 'hidden words' where story_id = s1;
  exception when check_violation then ok := true;
  end;
  assert ok, '4 looks_good must not carry a note';
  checks := checks + 1;

  -- 5. Notes are short.
  ok := false;
  begin
    update public.centre_story_reviews set status = 'note', note = repeat('a', 401) where story_id = s1;
  exception when check_violation then ok := true;
  end;
  assert ok, '5 a note over 400 characters must be refused';
  checks := checks + 1;
  update public.centre_story_reviews set status = 'note', note = repeat('a', 400) where story_id = s1;
  checks := checks + 1;

  -- 7. Only the two listed answers exist.
  ok := false;
  begin
    update public.centre_story_reviews set status = 'approved', note = null where story_id = s1;
  exception when check_violation then ok := true;
  end;
  assert ok, '7 an unknown status must be refused';
  checks := checks + 1;

  -- 8. Deleting the story deletes its answers.
  delete from public.stories where id = s1;
  assert not exists (select 1 from public.centre_story_reviews where centre_id = c1), '8 answers must go with their story';
  checks := checks + 1;

  -- 9. A child profile links to at most one centre child.
  insert into public.centre_children (centre_id, name, created_by) values (c1, 'Mia', u_owner) returning id into cc;
  insert into public.centre_child_links (child_profile_id, centre_child_id, centre_id, linked_by) values (kid1, cc, c1, u_owner), (kid2, cc, c1, u_owner);
  ok := false;
  begin
    insert into public.centre_child_links (child_profile_id, centre_child_id, centre_id) values (kid1, cc, c1);
  exception when unique_violation then ok := true;
  end;
  assert ok, '9 a child profile must link to one centre child only';
  checks := checks + 1;

  -- 10. Names are first names: short and not empty.
  ok := false;
  begin
    insert into public.centre_children (centre_id, name) values (c1, ' ');
  exception when check_violation then ok := true;
  end;
  assert ok, '10 an empty child name must be refused';
  checks := checks + 1;
  ok := false;
  begin
    insert into public.centre_children (centre_id, name) values (c1, repeat('b', 41));
  exception when check_violation then ok := true;
  end;
  assert ok, '11 a child name over 40 characters must be refused';
  checks := checks + 1;

  -- 12. Splitting a centre child removes its links and never the profiles.
  delete from public.centre_children where id = cc;
  assert not exists (select 1 from public.centre_child_links where centre_child_id = cc), '12 links must go with their centre child';
  assert (select count(*) from public.child_profiles where id in (kid1, kid2)) = 2, '12 the educators'' profiles must stay';
  checks := checks + 1;

  -- 13. The sample team switch starts off.
  assert (select sample_team_at from public.centres where id = c1) is null, '13 sample_team_at must start null';
  checks := checks + 1;

  -- 14-15. Service role only: RLS on, no policies, no grants for the public roles.
  assert (select bool_and(relrowsecurity) from pg_class where oid in ('public.centre_story_reviews'::regclass, 'public.centre_children'::regclass, 'public.centre_child_links'::regclass)),
    '14 the new tables must have row level security';
  assert not exists (select 1 from pg_policies where tablename in ('centre_story_reviews', 'centre_children', 'centre_child_links')), '14 there must be no policies';
  checks := checks + 1;
  assert not has_table_privilege('anon', 'public.centre_story_reviews', 'select')
     and not has_table_privilege('authenticated', 'public.centre_story_reviews', 'select')
     and not has_table_privilege('anon', 'public.centre_children', 'select')
     and not has_table_privilege('authenticated', 'public.centre_children', 'select')
     and not has_table_privilege('anon', 'public.centre_child_links', 'select')
     and not has_table_privilege('authenticated', 'public.centre_child_links', 'insert'),
    '15 the public roles must not reach the new tables';
  checks := checks + 1;

  -- Leave nothing behind for the next test file.
  delete from public.centre_children where centre_id = c1;
  delete from public.child_profiles where id in (kid1, kid2);
  delete from public.centres where id = c1;
  delete from public.profiles where id in (u_owner, u_edu);
  delete from auth.users where id in (u_owner, u_edu);

  raise notice 'all % checks passed', checks;
end $$;
