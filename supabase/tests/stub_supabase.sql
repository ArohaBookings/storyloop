-- The smallest Supabase-shaped database the 20260917 migrations need, so they
-- can be executed and tested against a throwaway local Postgres before anyone
-- applies them to production. Not a copy of the real schema: only the columns
-- these migrations and tests actually touch.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  if not exists (select 1 from pg_roles where rolname = 'postgres') then create role postgres; end if;
end $$;

create schema if not exists auth;
create schema if not exists private;

create table if not exists auth.users (id uuid primary key default gen_random_uuid());

-- Supabase's own auth.uid(), reproduced faithfully enough to test RLS: it reads
-- the subject out of the request's JWT claims, which is exactly what PostgREST
-- sets per connection. Without it, any policy written the normal Supabase way
-- cannot be executed here at all, which would mean RLS was the one thing the
-- verifier could not check.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  email text,
  full_name text,
  plan text default 'free',
  subscription_status text default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  upgraded_at timestamptz,
  stories_this_month int default 0,
  total_stories int default 0,
  monthly_story_limit_override int,
  applied_access_code text,
  story_preferences jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  is_internal boolean not null default false,
  referral_code text,
  referred_by uuid,
  last_seen_at timestamptz,
  last_story_at timestamptz,
  first_story_created_at timestamptz
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  content text,
  -- Nullable on purpose: 20260922_child_interests_never_null exists precisely
  -- to give these a default, so the stub must start in the broken shape the
  -- migration is there to fix, or the migration would be tested against a
  -- database that never had the problem.
  outcomes text[],
  next_steps text[]
);

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  name text,
  interests text[],
  created_at timestamptz default now()
);

create table if not exists private.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null default 'processing',
  processed_at timestamptz default now(),
  error text
);

-- Supabase's default privileges: tables in public are granted to the client
-- roles, and only row level security stands between them and the data. The
-- tests rely on this being true, exactly as it is in production.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
