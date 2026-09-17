-- ============================================================
-- STORYLOOP — Centre team model
-- ============================================================
-- Until now "Centre Starter" and "Centre Growth" were sold per centre while the
-- product had no concept of a centre at all: every query is scoped by user_id
-- and nothing joins two educators together. A centre that bought a plan got one
-- login to share, on a product that stores children's names.
--
-- This migration is PURELY ADDITIVE. It creates three new tables and touches no
-- existing one. An account with no centre membership behaves exactly as it does
-- today, which is what keeps the current paying educators safe.
--
-- Two rules are encoded here rather than left to application code:
--
--   1. CONTENT IS OPT IN. centre_members.shares_stories defaults to FALSE. A
--      centre can always see that an educator is writing (counts, recency) but
--      cannot read the writing itself unless that educator turns it on. Drafts
--      are working documents about real children, often about hard moments, and
--      a purchase order is not consent.
--
--   2. MEMBERSHIP IS EXPLICIT. There is no implicit membership by email domain
--      or by shared billing. You are in a centre because a row says so.
--
-- Note for whoever runs this: these tables are reached only through the service
-- role, which bypasses row level security, so the authorisation that matters is
-- the deny-by-default logic in lib/centres.ts. Do not bypass it with ad-hoc
-- queries. RLS is still enabled on all three below, with no policies, so no
-- client holding the public anon key can reach them directly.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ centres
create table if not exists public.centres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  -- Billing may stay on the owner's profile or move here later. Nullable so
  -- this migration does not force a billing decision.
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan text default 'centre_starter',
  -- Seats are what a centre actually buys. Enforced when an invite is accepted.
  seat_limit int not null default 10 check (seat_limit > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------- membership
create table if not exists public.centre_members (
  centre_id uuid not null references public.centres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- owner   : billing and deletion, exactly one per centre
  -- admin   : invite, remove, see aggregate activity
  -- educator: a seat, nothing more
  role text not null default 'educator' check (role in ('owner', 'admin', 'educator')),
  status text not null default 'active' check (status in ('active', 'removed')),
  -- The consent switch. FALSE means the centre sees that this educator wrote
  -- six stories this week, and not one word of any of them.
  shares_stories boolean not null default false,
  joined_at timestamptz default now(),
  removed_at timestamptz,
  primary key (centre_id, user_id)
);

-- An educator belongs to at most one centre. Two centres reading the same
-- children would be a privacy problem with no good answer, so it is refused
-- at the database rather than argued about in code.
create unique index if not exists centre_members_one_active_centre
  on public.centre_members (user_id)
  where status = 'active';

create index if not exists centre_members_centre_idx
  on public.centre_members (centre_id) where status = 'active';

-- ----------------------------------------------------------------- invites
create table if not exists public.centre_invites (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  email text not null,
  role text not null default 'educator' check (role in ('admin', 'educator')),
  -- Random, single use, and the only thing that proves the invite is genuine.
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists centre_invites_lookup_idx
  on public.centre_invites (centre_id, email)
  where accepted_at is null and revoked_at is null;

create index if not exists centre_invites_token_idx on public.centre_invites (token);

-- -------------------------------------------------------- aggregate metrics
-- What a director legitimately needs for rollout visibility, and nothing more:
-- who is on the team, whether they are writing, and when they last did. No
-- story text, no child names, no titles. Deliberately returns the same shape
-- whether or not an educator shares content, so the UI cannot accidentally
-- reveal who has opted out by the columns being different.
create or replace function public.centre_activity(p_centre_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  shares_stories boolean,
  stories_total int,
  stories_30d bigint,
  last_story_at timestamptz,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.user_id,
    p.full_name,
    p.email,
    m.role,
    m.shares_stories,
    coalesce(p.total_stories, 0) as stories_total,
    (
      select count(*)
      from public.stories s
      where s.user_id = m.user_id
        and s.created_at >= now() - interval '30 days'
    ) as stories_30d,
    p.last_story_at,
    m.joined_at
  from public.centre_members m
  join public.profiles p on p.id = m.user_id
  where m.centre_id = p_centre_id
    and m.status = 'active'
  order by coalesce(p.last_story_at, m.joined_at) desc;
$$;

revoke all on function public.centre_activity(uuid) from public, anon, authenticated;
grant execute on function public.centre_activity(uuid) to service_role;

-- Keep updated_at honest on centres.
create or replace function public.touch_centres_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists centres_touch_updated_at on public.centres;
create trigger centres_touch_updated_at
  before update on public.centres
  for each row execute function public.touch_centres_updated_at();

-- ------------------------------------------------------------ lock it down
-- Supabase grants tables in the public schema to the anon and authenticated
-- roles by default. Without row level security, anyone holding the public anon
-- key could read every invite token through the REST API, or insert themselves
-- into centre_members as an owner. These tables are only ever used through the
-- service role on the server, so RLS is enabled with NO policies: the server
-- still reads and writes (the service role bypasses RLS) and no client can.
-- The explicit revokes are defence in depth in case a policy is ever added.

alter table public.centres enable row level security;
alter table public.centre_members enable row level security;
alter table public.centre_invites enable row level security;

revoke all on table public.centres from anon, authenticated;
revoke all on table public.centre_members from anon, authenticated;
revoke all on table public.centre_invites from anon, authenticated;
