-- When a member last switched story sharing on (review 1, R1-08, 19 Nov 2026).
--
-- Stories and child profiles are not tied to a centre, so a leader's team views
-- must not reach back past the day the member joined THIS centre or switched
-- sharing on, whichever is later (lib/centre-team.ts teamReadsFrom). joined_at
-- already exists; this adds the sharing day. Nullable, no default, no backfill:
-- for an existing row the floor is joined_at alone. Safe on a live database
-- (adds one nullable column; nothing is rewritten) and safe to run twice.
alter table public.centre_members add column if not exists shares_stories_since timestamptz;

comment on column public.centre_members.shares_stories_since is
  'When the member last switched shares_stories on (null: not since this column existed). Team views read only what she wrote on or after max(joined_at, shares_stories_since).';
