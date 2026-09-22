-- ============================================================
-- STORYLOOP — Wall card translations
-- ============================================================
-- A parent at pickup reads the learning behind a display in their own language.
-- A grandparent whose phone is set to Samoan scans a painting and reads about
-- their mokopuna's morning in Samoan, without knowing there was a choice to
-- make. That is the moment this feature exists for.
--
-- WHY THIS IS SAFE TO STORE AND SAFE TO HAVE SENT TO A MODEL. The card was
-- already stripped of every name, date and age by lib/wall-card.ts, and an
-- educator confirmed it before publishing. There is nothing about any child in
-- it, which is what makes it the one piece of content here that can be handed
-- to a translation API at all. The privacy design pays for itself twice.
--
-- TRANSLATED AT PUBLISH, NEVER AT SCAN. A public page that called a paid API
-- on every scan would be a cost attack waiting to happen, and a grandparent
-- standing at a wall should not wait for a model. One bounded set of calls per
-- card, once, and then it is a lookup forever.
--
-- Shape: { "sm": { heading, body[], dispositions[], curriculum[], tryAtHome } }
-- Missing languages are simply absent. English is the card itself and is
-- always available, so a failed translation degrades to the original rather
-- than to nothing.

alter table public.wall_cards
  add column if not exists translations jsonb not null default '{}'::jsonb;

comment on column public.wall_cards.translations is
  'Machine translations of the de-identified card, keyed by BCP 47 tag. Contains no personal information, by construction.';
