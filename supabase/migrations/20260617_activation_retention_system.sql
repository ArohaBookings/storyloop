-- StoryLoop activation, retention, and conversion instrumentation.

alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists last_story_at timestamptz;
alter table public.profiles add column if not exists first_story_created_at timestamptz;
alter table public.profiles add column if not exists upgraded_at timestamptz;
alter table public.profiles add column if not exists marketing_unsubscribed_at timestamptz;

create table if not exists public.email_events (
  id uuid default gen_random_uuid() primary key,
  email_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  recipient text not null,
  subject text,
  provider_message_id text,
  delivery_status text not null default 'queued',
  related_story_id uuid references public.stories(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  opened_at timestamptz,
  clicked_at timestamptz,
  unsubscribed_at timestamptz,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.email_unsubscribes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  unsubscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.email_events enable row level security;
alter table public.email_unsubscribes enable row level security;

drop policy if exists "own_email_events" on public.email_events;
create policy "own_email_events" on public.email_events
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "own_email_unsubscribes" on public.email_unsubscribes;
create policy "own_email_unsubscribes" on public.email_unsubscribes
  for select
  using ((select auth.uid()) = user_id);

create index if not exists idx_profiles_last_seen on public.profiles(last_seen_at desc);
create index if not exists idx_profiles_last_story on public.profiles(last_story_at desc);
create index if not exists idx_profiles_first_story on public.profiles(first_story_created_at);
create index if not exists idx_profiles_upgraded_at on public.profiles(upgraded_at);
create index if not exists idx_profiles_marketing_unsubscribed on public.profiles(marketing_unsubscribed_at);

create index if not exists idx_email_events_user_type on public.email_events(user_id, email_type, sent_at desc);
create index if not exists idx_email_events_type_sent on public.email_events(email_type, sent_at desc);
create index if not exists idx_email_events_story on public.email_events(related_story_id);
create index if not exists idx_email_unsubscribes_user on public.email_unsubscribes(user_id);
create unique index if not exists idx_email_unsubscribes_email_unique
  on public.email_unsubscribes(email);

grant select on table public.email_events to authenticated;
grant select on table public.email_unsubscribes to authenticated;

create table if not exists private.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.app_secrets from public, anon, authenticated;
grant all on table private.app_secrets to postgres, service_role;

create or replace function public.get_app_secret(p_key text)
returns text as $$
declare
  secret_value text;
begin
  select value into secret_value
  from private.app_secrets
  where key = p_key;
  return secret_value;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to postgres, service_role;
