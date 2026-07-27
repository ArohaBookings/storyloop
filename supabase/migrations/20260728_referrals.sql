-- Referral programme.
--
-- Additive only: three nullable columns on profiles and one new table. No
-- existing row is modified, so live paying accounts are untouched.

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists referral_modal_seen_at timestamptz;

-- Codes must be globally unique so a link can never resolve to two people.
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

comment on column public.profiles.referral_code is
  'Public share code. Anyone signing up with it is attributed to this user.';
comment on column public.profiles.referral_modal_seen_at is
  'Set when the one-time referral welcome modal is dismissed.';

-- One row per referred person. Drives both the reward and the audit trail.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  -- A person can only ever be referred once, by one person. This unique
  -- constraint is the primary defence against double-crediting.
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  -- pending    : referred user signed up, has not paid yet
  -- credited   : referred user paid, referrer's free month has been granted
  -- capped     : referred user paid, but referrer already has 5 free months
  -- self       : rejected, someone tried to refer themselves
  status text not null default 'pending',
  credit_amount_cents integer,
  credit_currency text,
  stripe_balance_transaction_id text,
  -- The invoice that qualified this referral. Unique so a webhook replay or a
  -- duplicate Stripe delivery can never grant the same credit twice.
  stripe_invoice_id text unique,
  qualified_at timestamptz,
  credited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id, status);
create index if not exists referrals_created_idx on public.referrals (created_at desc);

alter table public.referrals enable row level security;

-- Read-only visibility of your own referrals; all writes happen server-side
-- with the service role, so a user can never fabricate a credit.
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_id);
