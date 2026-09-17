-- Proves the billing guard as a real signed-in user would hit it: every write
-- the live app makes through the user's connection still succeeds, and every
-- self-upgrade is refused. Runs statements AS the authenticated role.

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111') on conflict do nothing;
insert into public.profiles (id, email, plan, subscription_status, stories_this_month, total_stories)
values ('11111111-1111-1111-1111-111111111111', 'kaiako@example.nz', 'free', 'free', 2, 5)
on conflict (id) do update set plan = 'free', subscription_status = 'free', stories_this_month = 2,
  total_stories = 5, stripe_customer_id = null, monthly_story_limit_override = null;

-- A helper that runs one statement as the end-user role and reports what happened.
create or replace function pg_temp.as_user(stmt text) returns text language plpgsql as $$
begin
  set local role authenticated;
  execute stmt;
  reset role;
  return 'allowed';
exception when insufficient_privilege then
  reset role;
  return 'refused';
end $$;

do $$
declare
  me constant text := '''11111111-1111-1111-1111-111111111111''';
  r text;
begin
  -- ---------------------------------------------------------- still allowed
  r := pg_temp.as_user('update public.profiles set last_seen_at = now() where id = ' || me);
  assert r = 'allowed', '1 /api/me last_seen_at must still work: ' || r;

  r := pg_temp.as_user('update public.profiles set story_preferences = ''{"preferredTone":"warm"}'' where id = ' || me);
  assert r = 'allowed', '2 saving story preferences must still work: ' || r;

  -- exactly the generate route's usage increment
  r := pg_temp.as_user('update public.profiles set stories_this_month = 3, total_stories = 6, last_story_at = now(), first_story_created_at = now() where id = ' || me);
  assert r = 'allowed', '3 story generation usage increment must still work: ' || r;

  -- exactly checkout saving a brand-new Stripe customer
  r := pg_temp.as_user('update public.profiles set stripe_customer_id = ''cus_first'' where id = ' || me);
  assert r = 'allowed', '4 checkout saving the first customer id must still work: ' || r;

  r := pg_temp.as_user('update public.profiles set full_name = ''Aroha'' where id = ' || me);
  assert r = 'allowed', '5 editing your own name must still work: ' || r;

  -- ------------------------------------------------------------- refused
  r := pg_temp.as_user('update public.profiles set plan = ''centre_growth'' where id = ' || me);
  assert r = 'refused', 'FAIL 6: a user upgraded their own plan';

  r := pg_temp.as_user('update public.profiles set subscription_status = ''active'' where id = ' || me);
  assert r = 'refused', 'FAIL 7: a user activated their own subscription';

  r := pg_temp.as_user('update public.profiles set subscription_status = ''admin_override'' where id = ' || me);
  assert r = 'refused', 'FAIL 8: a user comped themselves';

  r := pg_temp.as_user('update public.profiles set monthly_story_limit_override = 1000 where id = ' || me);
  assert r = 'refused', 'FAIL 9: a user granted themselves unlimited stories';

  r := pg_temp.as_user('update public.profiles set stories_this_month = 0 where id = ' || me);
  assert r = 'refused', 'FAIL 10: a user reset their own free-tier usage';

  r := pg_temp.as_user('update public.profiles set total_stories = 0 where id = ' || me);
  assert r = 'refused', 'FAIL 11: a user decreased total stories';

  r := pg_temp.as_user('update public.profiles set stripe_customer_id = ''cus_someone_else'' where id = ' || me);
  assert r = 'refused', 'FAIL 12: a user swapped their Stripe customer';

  r := pg_temp.as_user('update public.profiles set stripe_customer_id = null where id = ' || me);
  assert r = 'refused', 'FAIL 13: a user cleared their Stripe customer';

  r := pg_temp.as_user('update public.profiles set is_internal = true where id = ' || me);
  assert r = 'refused', 'FAIL 14: a user hid themselves from revenue reporting';

  r := pg_temp.as_user('update public.profiles set applied_access_code = ''vip'' where id = ' || me);
  assert r = 'refused', 'FAIL 15: a user applied an access code directly';

  r := pg_temp.as_user('update public.profiles set trial_ends_at = now() + interval ''10 years'' where id = ' || me);
  assert r = 'refused', 'FAIL 16: a user extended their own trial';

  r := pg_temp.as_user('update public.profiles set referred_by = ''11111111-1111-1111-1111-111111111111'' where id = ' || me);
  assert r = 'refused', 'FAIL 17: a user set their own referrer';

  -- a sneaky combined write: a legitimate field plus a protected one
  r := pg_temp.as_user('update public.profiles set last_seen_at = now(), plan = ''educator_pro'' where id = ' || me);
  assert r = 'refused', 'FAIL 18: a protected change slipped through beside a legitimate one';

  -- ----------------------------------------- the server is never blocked
  update public.profiles set plan = 'centre_growth', subscription_status = 'active',
    stories_this_month = 0, monthly_story_limit_override = 50, stripe_customer_id = 'cus_server'
  where id = '11111111-1111-1111-1111-111111111111';
  assert (select plan from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'centre_growth',
    '19 the server (webhook, admin, monthly reset) must still be able to change billing fields';

  -- nothing refused above actually landed
  assert (select stripe_customer_id from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'cus_server',
    '20 unexpected stripe_customer_id';

  raise notice 'profile_billing_guard: all 20 checks passed';
end $$;
