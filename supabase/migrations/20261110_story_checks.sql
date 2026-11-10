-- Leader check (10 Nov 2026).
--
-- An educator asks their head teacher, educational leader or mentor to check one
-- story before it goes to families. The leader opens a private link, reads the
-- educator's note beside the story, and says "looks good" or suggests a change.
-- No account is needed to check a story.
--
-- Why a table of its own: the link is a capability. Whoever holds it can read
-- exactly one story for 14 days, so it is stored only as a hash, it expires, and
-- the educator can cancel it. Nothing here touches the stories table.
--
-- Reached only through the service role (app/api/check, app/api/stories/[id]/check).
-- RLS is on with no policies, and the default grants are revoked, so the public
-- anon key can never list or read a check.

create table if not exists public.story_checks (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'sent' check (status in ('sent', 'opened', 'approved', 'changes')),
  leader_name text,
  comment text,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  decided_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists story_checks_story_idx on public.story_checks (story_id, created_at desc);
create index if not exists story_checks_user_idx on public.story_checks (user_id, created_at desc);

alter table public.story_checks enable row level security;
revoke all on table public.story_checks from anon, authenticated;
