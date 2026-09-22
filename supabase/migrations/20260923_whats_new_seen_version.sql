-- The release a user has already been shown in the What's New card.
--
-- Production has had this column since the card first shipped, but no file in
-- this repository ever created it: it was added by hand. A database built from
-- the repository therefore lacked it, and the card's read failed there, which
-- makes every educator look like they have never seen a release. This records
-- what production already has. On production it changes nothing.
--
-- Written the moment the card appears (not when it is closed), so a reload or
-- a closed tab never shows it twice. See app/api/whats-new/route.ts.

alter table public.profiles
  add column if not exists whats_new_seen_version text;

comment on column public.profiles.whats_new_seen_version is
  'The What''s New release (lib/whats-new.ts WHATS_NEW_VERSION) this user has been shown. Set when the card appears.';
