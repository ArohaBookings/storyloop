-- Who has been offered what, and how far they got.
--
-- One row per person per offer (first used by the "Pro free for a month"
-- email). The row is the offer: checkout will only apply the offer's terms to
-- someone who has an unexpired, unredeemed row here, so an offer link forwarded
-- to a stranger, or opened twice, cannot be used twice. Each step is stamped so
-- the admin can see the funnel: sent, clicked, checkout opened, redeemed.
--
-- Server only. Nothing in the browser reads or writes this table.

create table if not exists public.offer_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  email_sent_at timestamptz,
  email_status text,
  clicked_at timestamptz,
  checkout_started_at timestamptz,
  checkout_session_id text,
  redeemed_at timestamptz,
  stripe_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, offer_id)
);

create index if not exists offer_grants_offer_idx on public.offer_grants (offer_id, granted_at desc);

alter table public.offer_grants enable row level security;
revoke all on public.offer_grants from anon, authenticated;
grant all on public.offer_grants to service_role;
