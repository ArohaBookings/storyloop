-- Growth analytics + internal accounts.
--
-- Purely additive: one nullable-by-default flag on profiles and two new tables.
-- No existing row is modified and no existing column changes type or meaning,
-- so live paying accounts are untouched by this migration.

-- 1. Internal / comp accounts (founder, staff, demo) must never count toward
--    revenue, MRR, or conversion reporting.
alter table public.profiles
  add column if not exists is_internal boolean not null default false;

comment on column public.profiles.is_internal is
  'Founder/staff/comp account. Excluded from MRR, revenue and conversion stats.';

-- 2. Anonymous funnel tracking: landing visits, traffic source, and demo usage
--    by people who have not signed up yet. Without this the top of the funnel
--    is invisible (we cannot tell paid clicks from organic, or see how many
--    visitors try the demo and then leave).
create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  -- page_view | demo_started | demo_completed | demo_clarification |
  -- demo_error | demo_limit | signup_view | signup_submitted | signup_completed
  event_type text not null,
  -- Rotating anonymous id from a first-party cookie. Not a person, not PII:
  -- it only stitches one browser's steps together within the funnel.
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  path text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  country text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists page_events_created_at_idx on public.page_events (created_at desc);
create index if not exists page_events_type_idx on public.page_events (event_type, created_at desc);
create index if not exists page_events_session_idx on public.page_events (session_id, created_at);
create index if not exists page_events_source_idx on public.page_events (utm_source, created_at desc);

alter table public.page_events enable row level security;

-- No public policies: analytics is written by the server (service role) and read
-- only by the admin dashboard (service role). Anon/authenticated clients get
-- nothing, so this can never leak visitor data.

-- 3. Attribution stamped on a profile at signup, so a signup can be traced back
--    to the campaign/source that produced it.
alter table public.profiles
  add column if not exists signup_source text,
  add column if not exists signup_campaign text,
  add column if not exists signup_referrer_host text,
  add column if not exists signup_session_id text;

comment on column public.profiles.signup_source is
  'utm_source (or referrer host) captured at signup for attribution.';
