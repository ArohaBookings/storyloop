-- ============================================================
-- STORYLOOP — Term settings
-- ============================================================
-- Where an educator's service is (NZ, or which Australian state or territory)
-- and whether it follows school terms. Used by term-aware features such as the
-- quiet child radar, so a school holiday is not mistaken for a child going
-- unnoticed.
--
-- Its own column on purpose. story_preferences looks like the obvious home, but
-- PATCH /api/me/preferences rewrites that object through an allowlist, so any
-- key it does not know is silently deleted the next time an educator saves a
-- story setting. It also feeds story generation, which must not change.
--
-- Additive and defaulted, so every existing row is valid the moment this runs.
-- Application code reads it only from the features that need it, with a
-- fallback, and never from the shared profile loader: adding it there before
-- this migration ran would have broken every profile load.

alter table public.profiles
  add column if not exists term_settings jsonb not null default '{}'::jsonb;
