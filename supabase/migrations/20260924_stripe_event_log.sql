-- ============================================================
-- STORYLOOP: a plain-English log of StoryLoop's own Stripe events
-- ============================================================
-- public.stripe_webhook_events already holds one row per Stripe event the
-- webhook processed (for idempotency). Since this release the webhook drops
-- other businesses' events on the shared Stripe account before recording
-- anything, so every new row is StoryLoop's. These columns let the admin page
-- say who each event was about and what it meant, in a sentence.
--
-- Additive only: nullable columns, no rewrite of existing rows, and the
-- begin/finish RPCs are untouched.

alter table public.stripe_webhook_events add column if not exists user_id uuid;
alter table public.stripe_webhook_events add column if not exists customer_id text;
alter table public.stripe_webhook_events add column if not exists amount integer;
alter table public.stripe_webhook_events add column if not exists currency text;
alter table public.stripe_webhook_events add column if not exists plan text;
alter table public.stripe_webhook_events add column if not exists summary text;
alter table public.stripe_webhook_events add column if not exists stripe_created_at timestamptz;

create index if not exists stripe_webhook_events_user_idx
  on public.stripe_webhook_events (user_id, received_at desc)
  where user_id is not null;
