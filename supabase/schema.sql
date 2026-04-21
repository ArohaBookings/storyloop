-- ============================================================
-- STORYLOOP — Supabase Database Schema v1.0
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- User profiles (one per auth user)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  plan text default 'free',  -- free | educator | centre
  subscription_status text default 'free',  -- free | trialing | active | past_due | cancelled | admin_override
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stories_this_month int default 0,
  total_stories int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  last_reset_at timestamptz default now()
);

-- Child profiles (optional - saved for quicker story creation)
create table if not exists public.child_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  age_group text,
  interests text[],
  developmental_focus text,
  notes text,
  created_at timestamptz default now()
);

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
  created_at timestamptz default now()
);

-- Admin audit log
create table if not exists public.admin_audit_log (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.stories enable row level security;
alter table public.admin_audit_log enable row level security;

-- Users can only see/edit their own data
drop policy if exists "own_profile" on public.profiles;
drop policy if exists "own_profile_update" on public.profiles;
create policy "own_profile" on public.profiles for select using (auth.uid() = id);
create policy "own_profile_update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own_children" on public.child_profiles;
drop policy if exists "own_stories" on public.stories;
create policy "own_children" on public.child_profiles for all using (auth.uid() = user_id);
create policy "own_stories" on public.stories for all using (auth.uid() = user_id);

-- Admin audit log: service-role only (no public access)
-- (access via API routes using createAdminSupabase())

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
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
$$ language plpgsql security definer;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_stories_user on public.stories(user_id);
create index if not exists idx_stories_created on public.stories(created_at desc);
create index if not exists idx_children_user on public.child_profiles(user_id);
create index if not exists idx_audit_created on public.admin_audit_log(created_at desc);
create index if not exists idx_profiles_plan on public.profiles(plan);
create index if not exists idx_profiles_stripe on public.profiles(stripe_customer_id);
