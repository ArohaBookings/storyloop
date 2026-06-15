create or replace function public.begin_stripe_webhook_event(p_event_id text, p_type text)
returns text as $$
declare
  existing_status text;
begin
  insert into private.stripe_webhook_events (event_id, type, status, processed_at)
  values (p_event_id, p_type, 'processing', now());
  return 'process';
exception
  when unique_violation then
    select status into existing_status
    from private.stripe_webhook_events
    where event_id = p_event_id;

    if existing_status = 'failed' then
      update private.stripe_webhook_events
      set status = 'processing',
          processed_at = now(),
          error = null
      where event_id = p_event_id;
      return 'process';
    end if;

    return 'duplicate';
end;
$$ language plpgsql security definer
set search_path = public, private;

create or replace function public.finish_stripe_webhook_event(p_event_id text, p_status text, p_error text default null)
returns void as $$
begin
  update private.stripe_webhook_events
  set status = p_status,
      processed_at = now(),
      error = p_error
  where event_id = p_event_id;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.begin_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.begin_stripe_webhook_event(text, text) to postgres, service_role;
revoke all on function public.finish_stripe_webhook_event(text, text, text) from public, anon, authenticated;
grant execute on function public.finish_stripe_webhook_event(text, text, text) to postgres, service_role;
