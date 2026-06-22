-- ============================================================
-- STORYLOOP — Supabase Database Schema v1.0
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- User profiles (one per auth user)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  plan text default 'free',  -- free | educator | centre
  subscription_status text default 'free',  -- free | trialing | active | past_due | payment_required | cancelled | admin_override
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stories_this_month int default 0,
  total_stories int default 0,
  monthly_story_limit_override int,
  applied_access_code text,
  story_preferences jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  last_seen_at timestamptz,
  last_story_at timestamptz,
  first_story_created_at timestamptz,
  upgraded_at timestamptz,
  marketing_unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  last_reset_at timestamptz default now()
);

alter table public.profiles add column if not exists monthly_story_limit_override int;
alter table public.profiles add column if not exists applied_access_code text;
alter table public.profiles add column if not exists story_preferences jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists last_story_at timestamptz;
alter table public.profiles add column if not exists first_story_created_at timestamptz;
alter table public.profiles add column if not exists upgraded_at timestamptz;
alter table public.profiles add column if not exists marketing_unsubscribed_at timestamptz;

-- Child profiles (optional - saved for quicker story creation)
create table if not exists public.child_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  age_group text,
  interests text[],
  developmental_focus text,
  notes text,
  whanau_aspirations text,
  home_languages text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz not null default now()
);

alter table public.child_profiles add column if not exists whanau_aspirations text;
alter table public.child_profiles add column if not exists home_languages text[] not null default '{}';
alter table public.child_profiles add column if not exists updated_at timestamptz not null default now();

-- Stories
create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  child_id uuid references public.child_profiles(id) on delete set null,
  child_name text,
  age_group text,
  observations text,
  story_text text not null,
  outcomes text[],
  next_steps text[],
  tone text default 'warm',
  location text default 'AU',
  word_count int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.stories add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.stories add column if not exists updated_at timestamptz default now();

-- Private access codes for complimentary allowances and stored preferences
create table if not exists private.access_codes (
  code text primary key,
  label text,
  description text,
  monthly_story_limit_override int,
  story_preferences jsonb not null default '{}'::jsonb,
  target_email text,
  max_redemptions int default 1,
  redemption_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

grant all on table private.access_codes to postgres, service_role;

create table if not exists private.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null default 'processing',
  processed_at timestamptz default now(),
  error text
);

revoke all on table private.stripe_webhook_events from public, anon, authenticated;
grant all on table private.stripe_webhook_events to postgres, service_role;

create table if not exists private.rate_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (scope, key_hash, window_start)
);

revoke all on table private.rate_limits from public, anon, authenticated;
grant all on table private.rate_limits to postgres, service_role;
alter table private.rate_limits enable row level security;

create table if not exists private.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.app_secrets from public, anon, authenticated;
grant all on table private.app_secrets to postgres, service_role;

create or replace function public.get_app_secret(p_key text)
returns text as $$
declare
  secret_value text;
begin
  select value into secret_value
  from private.app_secrets
  where key = p_key;
  return secret_value;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to postgres, service_role;

create or replace function public.begin_stripe_webhook_event(p_event_id text, p_type text)
returns text as $$
declare
  existing_status text;
begin
  insert into private.stripe_webhook_events (event_id, type, status, processed_at)
  values (p_event_id, p_type, 'processing', now());
  return 'process';
exception
  when unique_violation then
    select status into existing_status
    from private.stripe_webhook_events
    where event_id = p_event_id;

    if existing_status = 'failed' then
      update private.stripe_webhook_events
      set status = 'processing',
          processed_at = now(),
          error = null
      where event_id = p_event_id;
      return 'process';
    end if;

    return 'duplicate';
end;
$$ language plpgsql security definer
set search_path = public, private;

create or replace function public.finish_stripe_webhook_event(p_event_id text, p_status text, p_error text default null)
returns void as $$
begin
  update private.stripe_webhook_events
  set status = p_status,
      processed_at = now(),
      error = p_error
  where event_id = p_event_id;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.begin_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.begin_stripe_webhook_event(text, text) to postgres, service_role;
revoke all on function public.finish_stripe_webhook_event(text, text, text) from public, anon, authenticated;
grant execute on function public.finish_stripe_webhook_event(text, text, text) to postgres, service_role;

-- Admin audit log
create table if not exists public.admin_audit_log (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists public.feedback_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  category text not null default 'general',
  page text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.email_events (
  id uuid default gen_random_uuid() primary key,
  email_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  recipient text not null,
  subject text,
  provider_message_id text,
  delivery_status text not null default 'queued',
  related_story_id uuid references public.stories(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  opened_at timestamptz,
  clicked_at timestamptz,
  unsubscribed_at timestamptz,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.email_unsubscribes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  unsubscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.stories enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.email_events enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.feedback_submissions enable row level security;

-- Users can only see/edit their own data
drop policy if exists "own_profile" on public.profiles;
drop policy if exists "own_profile_update" on public.profiles;
create policy "own_profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "own_profile_update" on public.profiles for update using ((select auth.uid()) = id);

drop policy if exists "own_children" on public.child_profiles;
drop policy if exists "own_stories" on public.stories;
create policy "own_children" on public.child_profiles for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_stories" on public.stories for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Admin audit log: service-role only (no public access)
-- (access via API routes using createAdminSupabase())
drop policy if exists "admin_audit_locked" on public.admin_audit_log;
create policy "admin_audit_locked" on public.admin_audit_log for all using (false) with check (false);

drop policy if exists "own_email_events" on public.email_events;
create policy "own_email_events" on public.email_events
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "own_email_unsubscribes" on public.email_unsubscribes;
create policy "own_email_unsubscribes" on public.email_unsubscribes
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "own_feedback_insert" on public.feedback_submissions;
create policy "own_feedback_insert" on public.feedback_submissions
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "own_feedback_select" on public.feedback_submissions;
create policy "own_feedback_select" on public.feedback_submissions
  for select
  using ((select auth.uid()) = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

-- ============================================================
-- MONTHLY USAGE RESET (called from a cron)
-- ============================================================
create or replace function public.reset_monthly_usage()
returns void as $$
begin
  update public.profiles
  set stories_this_month = 0,
      last_reset_at = now()
  where last_reset_at < date_trunc('month', now());
end;
$$ language plpgsql security definer
set search_path = public;

revoke all on function public.reset_monthly_usage() from public, anon, authenticated;
grant execute on function public.reset_monthly_usage() to postgres, service_role;

create or replace function public.get_access_code_grant(p_code text, p_email text default null)
returns table (
  code text,
  label text,
  monthly_story_limit_override int,
  story_preferences jsonb
) as $$
begin
  return query
  select
    access.code,
    access.label,
    access.monthly_story_limit_override,
    access.story_preferences
  from private.access_codes access
  where access.code = lower(trim(p_code))
    and coalesce(access.is_active, true)
    and (access.expires_at is null or access.expires_at > now())
    and (access.target_email is null or (p_email is not null and lower(access.target_email) = lower(p_email)))
    and (access.max_redemptions is null or coalesce(access.redemption_count, 0) < access.max_redemptions);
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.get_access_code_grant(text, text) from public, anon, authenticated;
grant execute on function public.get_access_code_grant(text, text) to postgres, service_role;

create or replace function public.redeem_access_code(p_code text)
returns void as $$
begin
  update private.access_codes
  set redemption_count = coalesce(redemption_count, 0) + 1
  where code = lower(trim(p_code));
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.redeem_access_code(text) from public, anon, authenticated;
grant execute on function public.redeem_access_code(text) to postgres, service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean as $$
declare
  current_window timestamptz;
  next_count integer;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    return false;
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limits (scope, key_hash, window_start, request_count)
  values (p_scope, p_key_hash, current_window, 1)
  on conflict (scope, key_hash, window_start)
  do update set request_count = private.rate_limits.request_count + 1
  returning request_count into next_count;

  delete from private.rate_limits
  where window_start < now() - interval '2 days';

  return next_count <= p_limit;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to postgres, service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
    execute 'grant execute on function public.rls_auto_enable() to postgres, service_role';
  end if;
end $$;

insert into private.access_codes (
  code,
  label,
  description,
  monthly_story_limit_override,
  story_preferences,
  max_redemptions,
  is_active
)
values (
  'nikky',
  'Nikky complimentary access',
  'Ten free stories each month for the Nikky pilot user.',
  10,
  '{
    "defaultFramework": "NZ",
    "preferredTone": "warm",
    "languageStyle": "plain_ece",
    "emphasis": [
      "Te Whāriki learning outcomes",
      "learning dispositions",
      "Kōwhiti Whakapae social and emotional learning",
      "light te reo Māori",
      "Tapasā-informed cultural responsiveness"
    ],
    "depthPreference": "balanced",
    "includeTeReoLevel": "medium",
    "includeKowhitiWhakapae": true,
    "includeTapasa": true
  }'::jsonb,
  1,
  true
)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    monthly_story_limit_override = excluded.monthly_story_limit_override,
    story_preferences = excluded.story_preferences,
    max_redemptions = excluded.max_redemptions,
    is_active = excluded.is_active;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_stories_user on public.stories(user_id);
create index if not exists idx_stories_created on public.stories(created_at desc);
create index if not exists idx_stories_child on public.stories(child_id);
create index if not exists idx_children_user on public.child_profiles(user_id);
create index if not exists idx_children_user_name on public.child_profiles(user_id, lower(name));
create index if not exists idx_stories_user_child_created on public.stories(user_id, child_id, created_at desc);
create index if not exists idx_audit_created on public.admin_audit_log(created_at desc);
create index if not exists idx_profiles_plan on public.profiles(plan);
create index if not exists idx_profiles_stripe on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_last_seen on public.profiles(last_seen_at desc);
create index if not exists idx_profiles_last_story on public.profiles(last_story_at desc);
create index if not exists idx_profiles_first_story on public.profiles(first_story_created_at);
create index if not exists idx_profiles_upgraded_at on public.profiles(upgraded_at);
create index if not exists idx_profiles_marketing_unsubscribed on public.profiles(marketing_unsubscribed_at);
create index if not exists idx_email_events_user_type on public.email_events(user_id, email_type, sent_at desc);
create index if not exists idx_email_events_type_sent on public.email_events(email_type, sent_at desc);
create index if not exists idx_email_events_story on public.email_events(related_story_id);
create index if not exists idx_email_unsubscribes_user on public.email_unsubscribes(user_id);
create unique index if not exists idx_email_unsubscribes_email_unique
  on public.email_unsubscribes(email);
create index if not exists idx_feedback_submissions_user_created
  on public.feedback_submissions(user_id, created_at desc);
create index if not exists idx_feedback_submissions_status_created
  on public.feedback_submissions(status, created_at desc);
create index if not exists idx_feedback_submissions_category_created
  on public.feedback_submissions(category, created_at desc);

grant select on table public.email_events to authenticated;
grant select on table public.email_unsubscribes to authenticated;
grant insert, select on table public.feedback_submissions to authenticated;
