-- Which bell notifications an educator has already seen.
--
-- Notifications are not stored: they are worked out from facts StoryLoop
-- already holds (lib/notifications.ts), each with a stable id. The only thing
-- that needs remembering is which ids this person has opened the bell to see,
-- so the red count means "new since you last looked" and a fact is never new
-- twice. A bounded list of ids (at most 100, see mergeSeen) rather than a
-- table, because there is nothing else to keep.
--
-- The app reads this column on its own and treats a missing column as "nothing
-- seen yet", so deploying the code before this migration only means the count
-- falls back to the browser's memory. Safe to run more than once.

alter table public.profiles
  add column if not exists notification_state jsonb not null default '{}'::jsonb;

comment on column public.profiles.notification_state is
  'Bell read state: {"seen": [notification ids]}. Written only by /api/notifications with the service role.';
