-- ============================================================
-- STORYLOOP — Stripe webhook stale lock recovery
-- ============================================================
-- begin_stripe_webhook_event claims an event by inserting a 'processing' row.
-- If the handler throws, finish_stripe_webhook_event marks it 'failed' and
-- Stripe's retry reprocesses it. Good.
--
-- But if the handler is KILLED rather than throwing -- a serverless function
-- timeout, a deploy mid-request, an out-of-memory -- nothing marks it. The row
-- stays 'processing' forever, and every Stripe retry hits the unique violation,
-- finds 'processing', and returns 'duplicate'. The event is skipped permanently:
-- a payment that never activates a plan, a cancellation that is never recorded.
--
-- This changes exactly one branch: a 'processing' claim older than 15 minutes is
-- treated as abandoned and reclaimed, the same way a 'failed' one already is.
-- 15 minutes is comfortably longer than any Vercel function can run, so a
-- handler that is genuinely still working is never double-claimed.
--
-- Reprocessing is safe: profile updates are derived from Stripe's current
-- subscription state and are idempotent, and billing emails carry a per-invoice
-- billing_key so a retry cannot send a second receipt or payment notice.
--
-- Same signature, same return values, same grants. No other behaviour changes.

create or replace function public.begin_stripe_webhook_event(p_event_id text, p_type text)
returns text as $$
declare
  reclaimed int;
begin
  insert into private.stripe_webhook_events (event_id, type, status, processed_at)
  values (p_event_id, p_type, 'processing', now());
  return 'process';
exception
  when unique_violation then
    -- Reclaim in ONE conditional statement. Reading the status and then
    -- updating would let two simultaneous retries both see a stale row and both
    -- claim it; the WHERE clause here means only one UPDATE can match.
    update private.stripe_webhook_events
    set status = 'processing',
        processed_at = now(),
        error = null
    where event_id = p_event_id
      and (
        status = 'failed'
        or (status = 'processing' and processed_at < now() - interval '15 minutes')
      );
    get diagnostics reclaimed = row_count;

    if reclaimed > 0 then
      return 'process';
    end if;
    return 'duplicate';
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.begin_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.begin_stripe_webhook_event(text, text) to postgres, service_role;
