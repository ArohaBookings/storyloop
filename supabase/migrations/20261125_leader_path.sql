-- The leader path (25 Nov 2026).
--
-- Three things an educator can now ask of her leader, and the rows behind them:
--   1. one story check can carry two more choices: "add me to the team if my
--      leader starts our centre" (join_consent) and, later, "show where each
--      line came from" (show_sources, off until that feature is built);
--   2. a whole room of statements sent as one set (leader_sets, leader_set_items):
--      the content is stored only when she presses Send, readable for the life
--      of the link, and wiped 7 days after the link expires (purged_at);
--   3. the one email StoryLoop sends her leader for her, and its one reminder
--      (leader_emails). The address is kept only as long as the reminder needs
--      it; recipient_hash is what the daily cap and the stop link match on.
--
-- Additive and idempotent. Every new table is reachable only through the
-- service role: RLS on, no policies, all grants revoked from anon and
-- authenticated, exactly like story_checks.

alter table public.story_checks add column if not exists join_consent boolean not null default false;
alter table public.story_checks add column if not exists show_sources boolean not null default false;

create table if not exists public.leader_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  offer_ref_hash text unique,
  offer_claimed_by uuid references public.profiles(id) on delete set null,
  offer_claimed_at timestamptz,
  offer_invited_at timestamptz,
  centre_name text check (centre_name is null or char_length(centre_name) <= 80),
  status text not null default 'sent' check (status in ('sent', 'opened', 'answered')),
  join_consent boolean not null default false,
  show_sources boolean not null default false,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  purged_at timestamptz
);

create index if not exists leader_sets_user_idx on public.leader_sets (user_id, created_at desc);
create index if not exists leader_sets_purge_idx on public.leader_sets (expires_at) where purged_at is null;

create table if not exists public.leader_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.leader_sets(id) on delete cascade,
  position int not null check (position between 1 and 30),
  mode text not null check (mode in ('transition', 'summary')),
  framework text not null,
  child_first_name text,
  note text,
  draft jsonb,
  decision text check (decision in ('approved', 'changes')),
  comment text,
  decided_at timestamptz,
  unique (set_id, position)
);

create table if not exists public.leader_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_id uuid references public.story_checks(id) on delete cascade,
  set_id uuid references public.leader_sets(id) on delete cascade,
  recipient text,
  recipient_hash text not null,
  status text not null default 'sent' check (status in ('sent', 'reminded', 'stopped', 'bounced', 'failed', 'opened')),
  first_event_id uuid,
  first_sent_at timestamptz,
  reminder_due_at timestamptz,
  reminder_sent_at timestamptz,
  reminder_event_id uuid,
  created_at timestamptz not null default now(),
  -- Exactly one of a story check or a set.
  check ((check_id is null) <> (set_id is null))
);

create unique index if not exists leader_emails_check_idx on public.leader_emails (check_id) where check_id is not null;
create unique index if not exists leader_emails_set_idx on public.leader_emails (set_id) where set_id is not null;
create index if not exists leader_emails_user_idx on public.leader_emails (user_id, created_at desc);
create index if not exists leader_emails_recipient_idx on public.leader_emails (recipient_hash, created_at desc);
create index if not exists leader_emails_reminder_due_idx on public.leader_emails (reminder_due_at)
  where reminder_sent_at is null and status = 'sent';

alter table public.leader_sets enable row level security;
revoke all on table public.leader_sets from anon, authenticated;
alter table public.leader_set_items enable row level security;
revoke all on table public.leader_set_items from anon, authenticated;
alter table public.leader_emails enable row level security;
revoke all on table public.leader_emails from anon, authenticated;
