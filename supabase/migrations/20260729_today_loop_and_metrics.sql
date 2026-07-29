-- Today Loop: a lightweight daily observation inbox.
--
-- This is intentionally separate from learning stories. Educators can capture
-- a real moment now, then decide later whether it belongs in a story, planning
-- conversation, or nowhere at all. It does not create a second child record or
-- duplicate the story table.

create table if not exists public.daily_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete set null,
  child_name text,
  note text not null,
  status text not null default 'captured',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_captures_note_length check (char_length(note) between 10 and 2000),
  constraint daily_captures_status check (status in ('captured', 'planned', 'story_ready', 'archived'))
);

alter table public.daily_captures enable row level security;

drop policy if exists "own_daily_captures" on public.daily_captures;
create policy "own_daily_captures"
on public.daily_captures
for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    child_id is null
    or exists (
      select 1
      from public.child_profiles child
      where child.id = child_id
        and child.user_id = (select auth.uid())
    )
  )
);

grant select, insert, update, delete on table public.daily_captures to authenticated;

create index if not exists daily_captures_user_observed_idx
  on public.daily_captures(user_id, observed_at desc);

create index if not exists daily_captures_user_status_idx
  on public.daily_captures(user_id, status, updated_at desc);

create index if not exists daily_captures_child_idx
  on public.daily_captures(child_id, observed_at desc)
  where child_id is not null;

comment on table public.daily_captures is
  'Text-first daily moments awaiting an educator decision; not automatically a learning story or compliance record.';

-- A bounded, server-only product-health aggregate for the admin dashboard and
-- read-only MCP tools. Aggregation stays in Postgres so the same query remains
-- flat when the profile and story tables are much larger.
create or replace function public.admin_product_health(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with window_settings as (
    select now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365))) as since
  ),
  story_window as (
    select
      created_at,
      case
        when metadata->'storyQuality'->>'score' ~ '^[0-9]+(\.[0-9]+)?$'
          then (metadata->'storyQuality'->>'score')::numeric
        else null
      end as score,
      case
        when metadata->'storyQuality'->>'passes' in ('true', 'false')
          then (metadata->'storyQuality'->>'passes')::boolean
        else false
      end as passes
    from public.stories, window_settings
    where created_at >= window_settings.since
  ),
  capture_window as (
    select user_id, status, created_at
    from public.daily_captures, window_settings
    where created_at >= window_settings.since
  )
  select jsonb_build_object(
    'window_days', greatest(1, least(coalesce(p_days, 30), 365)),
    'quality', jsonb_build_object(
      'stories', (select count(*) from story_window),
      'scored', (select count(score) from story_window),
      'average_score', (select coalesce(round(avg(score), 1), 0) from story_window),
      'passed', (select count(*) from story_window where score is not null and passes),
      'pass_rate', (
        select case when count(score) = 0 then 0
          else round(100.0 * count(*) filter (where score is not null and passes) / count(score), 1)
        end
        from story_window
      )
    ),
    'today_loop', jsonb_build_object(
      'captures', (select count(*) from capture_window),
      'active_users', (select count(distinct user_id) from capture_window),
      'open', (select count(*) from capture_window where status = 'captured'),
      'planned', (select count(*) from capture_window where status = 'planned'),
      'story_ready', (select count(*) from capture_window where status = 'story_ready'),
      'archived', (select count(*) from capture_window where status = 'archived')
    ),
    'reviews', jsonb_build_object(
      'pending', (select count(*) from public.reviews where status = 'pending'),
      'published', (select count(*) from public.reviews where status = 'published'),
      'hidden', (select count(*) from public.reviews where status = 'hidden')
    )
  );
$$;

revoke all on function public.admin_product_health(integer) from public, anon, authenticated;
grant execute on function public.admin_product_health(integer) to postgres, service_role;
