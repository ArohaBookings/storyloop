-- ============================================================
-- STORYLOOP — Wall cards
-- ============================================================
-- A small printed code beside a display. A parent scans it at pickup and reads
-- the learning behind what they are looking at. No app, no login.
--
-- THE THREAT MODEL, because this is the first thing StoryLoop has ever served
-- to an unauthenticated stranger:
--
--   * the code is printed on a wall in a building the public walks through,
--     so assume the code is public the moment it is printed
--   * assume it is photographed, posted, and indexed
--   * therefore the row this serves must be safe to publish in full
--
-- So `card` holds ONLY de-identified content, produced by lib/wall-card.ts and
-- confirmed by the educator who wrote it. The scrub report, which necessarily
-- names what was removed, lives in `scrub_report` and is NEVER selected by the
-- public path. Two columns rather than one object, so the dangerous half
-- cannot be served by forgetting to strip a field.
--
-- Under the Privacy Act 2020 a breach likely to cause serious harm must be
-- notified to the Privacy Commissioner and to every affected family. Every
-- decision here is made with that sentence in mind.

create table if not exists public.wall_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- What is printed. Unguessable, and short enough to read aloud or type, so a
  -- parent can check the printed address matches where the scan took them.
  -- A swapped sticker is the real attack on a wall code; a human-readable
  -- destination is what makes the swap visible.
  code text not null unique,

  -- The PUBLIC payload. Safe to serve to anyone, by construction.
  card jsonb not null,

  -- The educator's record of what the scrub removed. Contains names.
  -- Never served publicly. Never selected by the public route.
  scrub_report jsonb not null default '{}'::jsonb,

  -- Which story it was built from, so an educator can find their way back.
  -- Not exposed publicly either.
  source_story_id uuid references public.stories(id) on delete set null,

  status text not null default 'draft' check (status in ('draft', 'published', 'revoked')),

  -- A code on a wall outlives the display it belongs to. Default life is one
  -- term and a bit; renewing is one click, and expiry is enforced on read.
  expires_at timestamptz not null default (now() + interval '100 days'),
  revoked_at timestamptz,

  -- How many times it was scanned. A COUNT ONLY. Who scanned it, from where,
  -- on what device, is not collected: a product that tells a centre which
  -- parent scanned what has started surveilling families at the school gate.
  scan_count integer not null default 0,
  last_scanned_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wall_cards_user_idx on public.wall_cards (user_id, created_at desc);
-- The public lookup: by code, only where it is live. Partial, so the index
-- itself is small and the common path never touches revoked or expired rows.
create index if not exists wall_cards_live_code_idx on public.wall_cards (code) where status = 'published';

alter table public.wall_cards enable row level security;

-- Educators see and manage only their own cards. The public route does not use
-- this path at all: it reads through the service role with an explicit column
-- list, so a policy mistake cannot widen what a stranger receives.
drop policy if exists "wall cards are private to their owner" on public.wall_cards;
create policy "wall cards are private to their owner"
  on public.wall_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at honest without application code having to remember.
create or replace function public.touch_wall_card()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists wall_cards_touch on public.wall_cards;
create trigger wall_cards_touch
  before update on public.wall_cards
  for each row execute function public.touch_wall_card();

-- Counting a scan must not require the ability to read or change anything else
-- about the card, and must not be usable to enumerate codes: it reports nothing
-- back about whether the code existed.
create or replace function public.count_wall_card_scan(card_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wall_cards
     set scan_count = scan_count + 1,
         last_scanned_at = now()
   where code = card_code
     and status = 'published'
     and expires_at > now();
end;
$$;

revoke all on function public.count_wall_card_scan(text) from public;
grant execute on function public.count_wall_card_scan(text) to service_role;
