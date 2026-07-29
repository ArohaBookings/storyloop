-- Quality pass rate is meaningful only across stories that received a score.
-- Unscored historical stories remain visible in the generated/scored totals,
-- but no longer count as automatic failures.

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
