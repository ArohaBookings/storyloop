-- Stripe webhook claim and stale lock recovery.
-- Every case raises on failure; the final NOTICE only prints if all pass.

do $$
declare r text;
begin
  delete from private.stripe_webhook_events;

  r := public.begin_stripe_webhook_event('evt_new', 'invoice.paid');
  assert r = 'process', format('1 new event: expected process, got %s', r);

  r := public.begin_stripe_webhook_event('evt_new', 'invoice.paid');
  assert r = 'duplicate', format('2 retry while processing: expected duplicate, got %s', r);

  update private.stripe_webhook_events set status = 'processed' where event_id = 'evt_new';
  r := public.begin_stripe_webhook_event('evt_new', 'invoice.paid');
  assert r = 'duplicate', format('3 completed event: expected duplicate, got %s', r);

  insert into private.stripe_webhook_events values ('evt_failed', 'invoice.paid', 'failed', now(), 'boom');
  r := public.begin_stripe_webhook_event('evt_failed', 'invoice.paid');
  assert r = 'process', format('4 failed event retried: expected process, got %s', r);
  assert (select error from private.stripe_webhook_events where event_id = 'evt_failed') is null, '4 error not cleared';

  -- The fix: a handler killed mid-run left this claimed for 20 minutes.
  insert into private.stripe_webhook_events values ('evt_stuck', 'customer.subscription.deleted', 'processing', now() - interval '20 minutes', null);
  r := public.begin_stripe_webhook_event('evt_stuck', 'customer.subscription.deleted');
  assert r = 'process', format('5 abandoned claim recovered: expected process, got %s', r);

  r := public.begin_stripe_webhook_event('evt_stuck', 'customer.subscription.deleted');
  assert r = 'duplicate', format('6 just reclaimed: expected duplicate, got %s', r);

  -- A handler that may genuinely still be running is never double-claimed.
  insert into private.stripe_webhook_events values ('evt_slow', 'invoice.paid', 'processing', now() - interval '10 minutes', null);
  r := public.begin_stripe_webhook_event('evt_slow', 'invoice.paid');
  assert r = 'duplicate', format('7 ten-minute claim left alone: expected duplicate, got %s', r);

  -- The health RPC's idea of "stuck" matches the recovery threshold exactly.
  assert (public.admin_system_health(7)->'webhooks'->>'stuck_processing')::int = 0,
    '8 a ten-minute claim must not be reported stuck';
  update private.stripe_webhook_events set processed_at = now() - interval '16 minutes' where event_id = 'evt_slow';
  assert (public.admin_system_health(7)->'webhooks'->>'stuck_processing')::int = 1,
    '9 a sixteen-minute claim must be reported stuck';

  assert not has_function_privilege('anon', 'public.admin_system_health(int)', 'execute'), '10 anon can read system health';
  assert not has_function_privilege('authenticated', 'public.admin_system_health(int)', 'execute'), '11 authenticated can read system health';

  raise notice 'webhook_recovery: all 11 checks passed';
end $$;
