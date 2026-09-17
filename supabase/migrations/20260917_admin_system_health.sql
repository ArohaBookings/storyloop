-- ============================================================
-- STORYLOOP — Admin system health (read only)
-- ============================================================
-- Stripe webhook outcomes live in private.stripe_webhook_events, which is not
-- exposed through PostgREST, so the admin dashboard cannot see whether billing
-- events are failing. This exposes AGGREGATES and recent failures only, to the
-- service role only. It writes nothing and changes no existing object.
--
-- A webhook left in 'processing' for more than fifteen minutes means the
-- handler was killed before finishing. Without
-- 20260917_webhook_stale_lock_recovery.sql, Stripe's retries are treated as
-- duplicates and skipped forever; with it, the next retry reclaims the event.
-- The threshold here matches that migration's, so "stuck" on the dashboard
-- means exactly "eligible for recovery".
--
-- Also worth knowing for whoever maintains this: admin_dashboard_metrics, which
-- /admin/growth depends on, is NOT defined in this repository's schema or
-- migrations. It exists only in the live database. Capture its definition into
-- a migration before the database is ever rebuilt.

create or replace function public.admin_system_health(p_days int default 7)
returns jsonb
language sql
security definer
set search_path = public, private
as $$
  with window_events as (
    select event_id, type, status, processed_at, error
    from private.stripe_webhook_events
    where processed_at >= now() - make_interval(days => greatest(1, least(p_days, 90)))
  )
  select jsonb_build_object(
    'window_days', greatest(1, least(p_days, 90)),
    'webhooks', jsonb_build_object(
      'total', (select count(*) from window_events),
      'processed', (select count(*) from window_events where status = 'processed'),
      'failed', (select count(*) from window_events where status = 'failed'),
      'stuck_processing', (
        select count(*) from private.stripe_webhook_events
        where status = 'processing' and processed_at < now() - interval '15 minutes'
      ),
      'by_type', coalesce((
        select jsonb_agg(jsonb_build_object('type', type, 'total', total, 'failed', failed) order by total desc)
        from (
          select type, count(*) as total, count(*) filter (where status = 'failed') as failed
          from window_events group by type
        ) t
      ), '[]'::jsonb),
      'recent_failures', coalesce((
        select jsonb_agg(jsonb_build_object('type', type, 'status', status, 'at', processed_at, 'error', left(coalesce(error, ''), 240)) order by processed_at desc)
        from (
          select type, status, processed_at, error
          from private.stripe_webhook_events
          where status = 'failed'
             or (status = 'processing' and processed_at < now() - interval '15 minutes')
          order by processed_at desc
          limit 20
        ) f
      ), '[]'::jsonb)
    )
  );
$$;

revoke all on function public.admin_system_health(int) from public, anon, authenticated;
grant execute on function public.admin_system_health(int) to service_role;
