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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  email text,
  full_name text,
  total_stories int default 0,
  last_story_at timestamptz
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  content text
);

create table if not exists private.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null default 'processing',
  processed_at timestamptz default now(),
  error text
);
