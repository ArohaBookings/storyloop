alter table public.child_profiles
  add column if not exists whanau_aspirations text,
  add column if not exists home_languages text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

update public.child_profiles
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

drop policy if exists "own_children" on public.child_profiles;
create policy "own_children"
on public.child_profiles
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "own_stories" on public.stories;
create policy "own_stories"
on public.stories
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists idx_children_user_name
  on public.child_profiles(user_id, lower(name));

create index if not exists idx_stories_user_child_created
  on public.stories(user_id, child_id, created_at desc);

create table if not exists private.rate_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (scope, key_hash, window_start)
);

revoke all on table private.rate_limits from public, anon, authenticated;
grant all on table private.rate_limits to postgres, service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean as $$
declare
  current_window timestamptz;
  next_count integer;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    return false;
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_limits (scope, key_hash, window_start, request_count)
  values (p_scope, p_key_hash, current_window, 1)
  on conflict (scope, key_hash, window_start)
  do update set request_count = private.rate_limits.request_count + 1
  returning request_count into next_count;

  delete from private.rate_limits
  where window_start < now() - interval '2 days';

  return next_count <= p_limit;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to postgres, service_role;

alter table private.rate_limits enable row level security;
