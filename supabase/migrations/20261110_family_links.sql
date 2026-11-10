-- Family link (10 Nov 2026).
--
-- A private link an educator gives to one child's family. Whoever holds it reads
-- the stories the educator chose to share about that child, in their own
-- language where a translation was prepared, and can write back. No app, no
-- account, no password, and no photographs.
--
-- Three tables, and nothing here touches an existing one:
--   family_links   one link per person it was given to ("Mum", "Nana"). The link
--                  is a capability, so only its hash is stored, it expires, and
--                  the educator can cancel it.
--   family_shares  which stories the educator shared with the family, and the
--                  translations prepared for them at that moment. A story that
--                  was not shared is never reachable through any link.
--   family_replies what the family wrote back, as they wrote it, with an English
--                  reading beside it where one could be made.
--
-- Reached only through the service role (app/api/family, app/api/stories/[id]/family,
-- app/api/children/[id]/family-links). RLS is on with no policies and the default
-- grants are revoked, so the public anon key can never list or read any of it.

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  label text,
  language text,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0
);
create index if not exists family_links_child_idx on public.family_links (child_id, created_at desc);
create index if not exists family_links_user_idx on public.family_links (user_id, created_at desc);

create table if not exists public.family_shares (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  translations jsonb not null default '{}'::jsonb,
  shared_at timestamptz not null default now()
);
create index if not exists family_shares_child_idx on public.family_shares (child_id, shared_at desc);
create index if not exists family_shares_user_idx on public.family_shares (user_id, shared_at desc);

create table if not exists public.family_replies (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.family_links(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  body_en text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists family_replies_user_idx on public.family_replies (user_id, created_at desc);
create index if not exists family_replies_link_idx on public.family_replies (link_id, created_at desc);
create index if not exists family_replies_story_idx on public.family_replies (story_id);

alter table public.family_links enable row level security;
alter table public.family_shares enable row level security;
alter table public.family_replies enable row level security;
revoke all on table public.family_links from anon, authenticated;
revoke all on table public.family_shares from anon, authenticated;
revoke all on table public.family_replies from anon, authenticated;

comment on column public.family_shares.translations is
  'Translations prepared when the story was shared, keyed by language code: { code: { title, text, notice, source } }. `source` is a hash of the story text that was translated, so an edited story never shows a stale translation.';
