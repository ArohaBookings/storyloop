-- A leader's first session (18 Nov 2026): the team review queue, a minimal
-- centre child list, and the sample team switch.
--
-- Until now a leader on a centre plan saw her team's activity counts and
-- nothing else: every tool read only her own stories. Three additions, all
-- additive and idempotent, none of them touching an existing column:
--
--   centre_story_reviews  One row per centre per story: a leader marked a
--                         shared story "looks good" or left a short note the
--                         author sees on her story. Only ids, the leader's own
--                         words and dates are stored: never a copy of the story.
--
--   centre_children       The centre's own short list of children (first names
--   centre_child_links    only), so the same child written about by two
--                         educators is counted once in the team's evidence. A
--                         link points at an educator's child profile; the
--                         profile itself is not changed and stays hers.
--
--   centres.sample_team_at  When a leader with nobody invited yet opened the
--                         sample team. The sample's educators, children and
--                         stories live in code (lib/sample-team.ts), never in
--                         a table, so they cannot be counted anywhere.
--
-- Who may read or write any of this is decided in lib/centre-team.ts (pure,
-- tested) and enforced by the server routes, which reach these tables only
-- through the service role. RLS is on with no policies and the default grants
-- are revoked, exactly like the other centre tables, so the public anon key can
-- never list a review, a note or a child.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------- team reviews
create table if not exists public.centre_story_reviews (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  -- The story's author, kept so she can read what was said about her stories
  -- without anyone joining across centres.
  author_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('looks_good', 'note')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- When the author first saw this answer on her story (null: not yet).
  author_seen_at timestamptz,
  constraint centre_story_reviews_note_length check (note is null or char_length(note) <= 400),
  -- A note needs words; "looks good" carries none.
  constraint centre_story_reviews_note_shape check (
    (status = 'note' and note is not null and char_length(btrim(note)) > 0)
    or (status = 'looks_good' and note is null)
  )
);

-- One answer per story per centre: a later answer replaces the earlier one.
create unique index if not exists centre_story_reviews_one_per_story
  on public.centre_story_reviews (centre_id, story_id);
create index if not exists centre_story_reviews_author_idx
  on public.centre_story_reviews (author_id, updated_at desc);

-- ------------------------------------------------- minimal centre child list
create table if not exists public.centre_children (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references public.centres(id) on delete cascade,
  -- First names only, like everywhere else in StoryLoop.
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint centre_children_name_length check (char_length(btrim(name)) between 1 and 40)
);

create index if not exists centre_children_centre_idx on public.centre_children (centre_id);

create table if not exists public.centre_child_links (
  -- An educator's child profile belongs to at most one centre child.
  child_profile_id uuid primary key references public.child_profiles(id) on delete cascade,
  centre_child_id uuid not null references public.centre_children(id) on delete cascade,
  centre_id uuid not null references public.centres(id) on delete cascade,
  linked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists centre_child_links_centre_idx on public.centre_child_links (centre_id);
create index if not exists centre_child_links_child_idx on public.centre_child_links (centre_child_id);

-- ------------------------------------------------------------- sample team
alter table public.centres add column if not exists sample_team_at timestamptz;

-- ------------------------------------------------------------ lock it down
alter table public.centre_story_reviews enable row level security;
alter table public.centre_children enable row level security;
alter table public.centre_child_links enable row level security;

revoke all on table public.centre_story_reviews from anon, authenticated;
revoke all on table public.centre_children from anon, authenticated;
revoke all on table public.centre_child_links from anon, authenticated;
