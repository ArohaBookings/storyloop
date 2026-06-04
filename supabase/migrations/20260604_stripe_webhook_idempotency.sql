create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

create table if not exists private.stripe_webhook_events (
  event_id text primary key,
  type text not null,
  status text not null default 'processing',
  processed_at timestamptz default now(),
  error text
);

revoke all on table private.stripe_webhook_events from public, anon, authenticated;
grant all on table private.stripe_webhook_events to postgres, service_role;
