-- ============================================================
-- STORYLOOP — Children's own words
-- ============================================================
-- Every piece of early childhood documentation ever written is an adult
-- describing a child. Both curricula ask for the child's voice and assessors
-- look for evidence a child's views were sought; in practice it is a quote an
-- adult half-remembered a week later. This table holds the other thing: what
-- the child said about their own work, kept verbatim.
--
-- THERE IS NO AUDIO COLUMN, AND THAT IS THE DESIGN.
--
-- Two findings decided it, and both are worth writing down because the
-- temptation to "just store the recording" will come back:
--
--  1. New Zealand's Biometric Processing Privacy Code 2025 is now law and
--     covers voice used to identify, verify or categorise a person, with
--     heightened scrutiny where children are involved. A stored corpus of
--     children's voice recordings sits one product decision away from being
--     biometric processing, and the breach-notification duty under the Privacy
--     Act 2020 would attach to the most sensitive audio a service holds.
--
--  2. Speech recognition on this age group is bad enough that audio would not
--     even buy accuracy: published word error rates run to about 35% for
--     kindergarten-aged children and 63% for spontaneous preschool speech in a
--     real room, against roughly 5% for adults.
--
-- So the recording lives in the browser tab for as long as it takes the child
-- to hear themselves back and the educator to write down what they said, and
-- then it is gone. What persists is the words and an honest record of how they
-- were captured. A keepsake of a child's actual voice is a lovely thing and a
-- different product with its own consent, retention and deletion design.
--
-- `provenance` exists so the record never overstates itself:
--   typed                   an educator wrote down what they heard
--   transcribed_confirmed   a machine draft the educator accepted as accurate
--   transcribed_corrected   a machine draft the educator had to change

alter table public.child_profiles
  add column if not exists voice_consent_at timestamptz;

comment on column public.child_profiles.voice_consent_at is
  'When this child''s family agreed they may record their own voice notes. Null means no consent and recording is refused.';

create table if not exists public.child_voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,

  -- The child's own words, exactly as they were said. Never rewritten, never
  -- tidied into adult grammar, never passed through a model on the way in.
  -- "I builded a tower" is the record; correcting it would erase the thing
  -- this table exists to hold.
  words text not null check (length(btrim(words)) between 1 and 600),

  -- What they were talking about, in the educator's words. Optional, and kept
  -- separate so an adult's framing can never be mistaken for the child's.
  about text check (about is null or length(about) <= 200),

  provenance text not null default 'typed'
    check (provenance in ('typed', 'transcribed_confirmed', 'transcribed_corrected')),

  -- Set when these words were carried into a written story.
  story_id uuid references public.stories(id) on delete set null,

  said_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists child_voice_notes_child_idx
  on public.child_voice_notes (child_id, said_at desc);
create index if not exists child_voice_notes_user_idx
  on public.child_voice_notes (user_id, said_at desc);

alter table public.child_voice_notes enable row level security;

drop policy if exists "voice notes are private to their educator" on public.child_voice_notes;
create policy "voice notes are private to their educator"
  on public.child_voice_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A note may only exist for a child whose family has agreed to it. Application
-- code checks this too, but consent is exactly the kind of rule that must not
-- depend on every future code path remembering it.
create or replace function public.require_child_voice_consent()
returns trigger
language plpgsql
as $$
declare
  consented timestamptz;
  owner uuid;
begin
  select voice_consent_at, user_id into consented, owner
    from public.child_profiles where id = new.child_id;

  if owner is null or owner is distinct from new.user_id then
    raise exception 'A voice note must belong to the educator who holds that child profile.'
      using errcode = '42501';
  end if;

  if consented is null then
    raise exception 'This child has no recorded family consent for voice notes.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists child_voice_notes_require_consent on public.child_voice_notes;
create trigger child_voice_notes_require_consent
  before insert or update on public.child_voice_notes
  for each row execute function public.require_child_voice_consent();

-- Withdrawing consent removes what was collected under it. A family that says
-- "actually, no" should not have to ask twice or trust us to remember.
create or replace function public.clear_voice_notes_on_consent_withdrawn()
returns trigger
language plpgsql
as $$
begin
  if old.voice_consent_at is not null and new.voice_consent_at is null then
    delete from public.child_voice_notes where child_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists child_profiles_voice_consent_withdrawn on public.child_profiles;
create trigger child_profiles_voice_consent_withdrawn
  after update on public.child_profiles
  for each row execute function public.clear_voice_notes_on_consent_withdrawn();
