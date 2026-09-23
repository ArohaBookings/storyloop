-- ============================================================
-- STORYLOOP: recover Stripe webhook events stuck mid-run
-- ============================================================
-- Targets public.stripe_webhook_events, the table production has used since
-- 4 August 2026 (see 20260804_stripe_webhook_idempotency_public.sql). The first
-- draft of this migration targeted the older private table; it was rewritten on
-- 2026-09-23 after checking production, before it was ever applied there.
--
-- Two holes in the version production runs:
--
--   1. A handler that died mid-run (a timeout, a deploy) left its event in
--      'processing' forever. Every Stripe retry got 'skip', so a cancellation
--      or a payment was never applied and nobody knew.
--   2. Reclaiming a 'failed' event read the status, then updated it, in two
--      steps. Two retries arriving together both saw 'failed' and both
--      processed the event.
--
-- The claim is now one conditional UPDATE. A failed event, or a processing
-- claim older than 15 minutes, is taken by exactly one caller: Postgres
-- re-checks the WHERE clause against the row the first caller just wrote, and
-- a fresh received_at no longer matches. A claim younger than 15 minutes is
-- left alone, because that handler may still be running. The return values are
-- unchanged ('process' or 'skip'); the webhook route only acts on 'process'.

create or replace function public.begin_stripe_webhook_event(
  p_event_id text,
  p_type text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  reclaimed int;
begin
  insert into public.stripe_webhook_events (event_id, type, status)
  values (p_event_id, p_type, 'processing')
  on conflict (event_id) do nothing;

  if found then
    return 'process';
  end if;

  update public.stripe_webhook_events
  set status = 'processing', error = null, received_at = now(), completed_at = null
  where event_id = p_event_id
    and (
      status = 'failed'
      or (status = 'processing' and received_at < now() - interval '15 minutes')
    );
  get diagnostics reclaimed = row_count;

  if reclaimed > 0 then
    return 'process';
  end if;
  return 'skip';
end;
$$;

revoke all on function public.begin_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.begin_stripe_webhook_event(text, text) to postgres, service_role;
