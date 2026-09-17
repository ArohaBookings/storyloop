-- ============================================================
-- STORYLOOP — Stop users granting themselves paid access
-- ============================================================
-- THE HOLE. profiles has this policy:
--
--   create policy "own_profile_update" on public.profiles
--     for update using ((select auth.uid()) = id);
--
-- It restricts WHICH ROW a signed-in user may update, but not WHICH COLUMNS.
-- Supabase's anon key is public by design (it ships in the browser), so any
-- signed-in user can call the REST API directly and set, on their own row:
--
--   plan = 'centre_growth', subscription_status = 'active'   -> every paid feature
--   monthly_story_limit_override = 1000                        -> unlimited stories
--   stories_this_month = 0, repeatedly                          -> unlimited free tier
--
-- without ever touching Stripe. Access control reads exactly these columns.
--
-- WHY A TRIGGER AND NOT A COLUMN GRANT. The obvious fix is to revoke UPDATE and
-- re-grant a column list. But the LIVE app legitimately writes several
-- profile columns through the user's own connection:
--
--   generate route       stories_this_month + 1, total_stories + 1,
--                        last_story_at, first_story_created_at
--   stripe checkout      stripe_customer_id, the first time only
--   /api/me              last_seen_at
--   preferences          story_preferences
--   regenerate           last_story_at
--
-- A column grant applied before a matching code deploy would make checkout fail
-- to save the customer id -- duplicate Stripe customers, and webhooks unable to
-- find who paid -- and would stop the free-tier counter incrementing. This
-- trigger allows every one of those writes exactly as the live code makes them,
-- so it is safe to apply at any time, before or after any deploy.
--
-- WHAT IT ALLOWS AND REFUSES, for requests made as an end user only:
--
--   refused   any change to plan, subscription_status, stripe_subscription_id,
--             trial_ends_at, current_period_end, upgraded_at,
--             monthly_story_limit_override, applied_access_code, is_internal,
--             is_active, referral_code, referred_by
--   refused   changing or clearing stripe_customer_id once it is set
--             (setting it for the first time, as checkout does, is allowed; the
--             unique constraint already stops anyone claiming another's id)
--   refused   decreasing stories_this_month or total_stories
--   allowed   everything else, including increments
--
-- WHO IS TRUSTED. Only requests running as the `authenticated` or `anon` roles
-- are checked. The service role used by every server route, the table owner,
-- and SECURITY DEFINER functions such as reset_monthly_usage and
-- redeem_access_code run as other roles and pass straight through, so the
-- webhook, admin tools, monthly reset and access codes all keep working.

create schema if not exists private;

create or replace function private.guard_profile_self_update()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.subscription_status is distinct from old.subscription_status
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end
     or new.upgraded_at is distinct from old.upgraded_at
     or new.monthly_story_limit_override is distinct from old.monthly_story_limit_override
     or new.applied_access_code is distinct from old.applied_access_code
     or new.is_internal is distinct from old.is_internal
     or new.is_active is distinct from old.is_active
     or new.referral_code is distinct from old.referral_code
     or new.referred_by is distinct from old.referred_by
  then
    raise exception 'Billing and access fields can only be changed by StoryLoop.'
      using errcode = '42501';
  end if;

  if old.stripe_customer_id is not null
     and new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'The billing customer on an account cannot be changed.'
      using errcode = '42501';
  end if;

  if coalesce(new.stories_this_month, 0) < coalesce(old.stories_this_month, 0)
     or coalesce(new.total_stories, 0) < coalesce(old.total_stories, 0) then
    raise exception 'Story usage can only be reset by StoryLoop.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function private.guard_profile_self_update();
