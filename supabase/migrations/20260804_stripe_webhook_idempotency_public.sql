-- ============================================================
-- STORYLOOP: webhook idempotency on public.stripe_webhook_events
-- ============================================================
-- RECORDED FROM PRODUCTION on 2026-09-23. This migration was applied to the
-- live database on 4 August 2026 (version 20260804033912) but never committed
-- here, so the repository still described the older private.stripe_webhook_events
-- table from June, which production stopped writing to on 1 August. It is copied
-- verbatim from supabase_migrations.schema_migrations so a database built from
-- this repository matches production. Do not re-run it against production: the
-- stale-lock recovery migration (20260917) replaces begin_stripe_webhook_event.
--
-- Stripe retries a webhook whenever it does not get a 2xx, so the same event
-- can arrive more than once. Without this table the handler logged a warning
-- and processed anyway, which could double-grant a plan or double-credit a
-- referral. This makes replay handling exact.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;
-- No policies: only the service role (which bypasses RLS) may touch this.
revoke all on public.stripe_webhook_events from anon, authenticated;

create index if not exists stripe_webhook_events_received_at_idx
  on public.stripe_webhook_events (received_at desc);

create or replace function public.begin_stripe_webhook_event(
  p_event_id text,
  p_type text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
begin
  insert into public.stripe_webhook_events (event_id, type, status)
  values (p_event_id, p_type, 'processing')
  on conflict (event_id) do nothing;

  if found then
    return 'process';
  end if;

  select status into v_existing
  from public.stripe_webhook_events
  where event_id = p_event_id;

  if v_existing = 'failed' then
    update public.stripe_webhook_events
    set status = 'processing', error = null, received_at = now(), completed_at = null
    where event_id = p_event_id;
    return 'process';
  end if;

  return 'skip';
end;
$$;

create or replace function public.finish_stripe_webhook_event(
  p_event_id text,
  p_status text,
  p_error text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stripe_webhook_events
  set status = p_status,
      error = p_error,
      completed_at = now()
  where event_id = p_event_id;
end;
$$;

revoke all on function public.begin_stripe_webhook_event(text, text) from anon, authenticated;
revoke all on function public.finish_stripe_webhook_event(text, text, text) from anon, authenticated;
