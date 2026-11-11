-- A rate limit's count must outlive its window (12 Nov 2026).
--
-- consume_rate_limit tidied up after itself by deleting every row whose window
-- began more than two days ago. Every limit then in use had a window of a day
-- or less, so nothing was lost. The free allowance for a child's statement or
-- summary (two in 30 days, live since 3 Nov 2026) uses a 30 day window, and its
-- row was deleted on almost every call: 28 days in every 30 the allowance was
-- not enforced at all. Found by the end-to-end test for the statement page.
--
-- Now a scope tidies its own rows once they are two windows old (never sooner
-- than two days), and anything older than 90 days goes whatever it is. The
-- signature and the grants are unchanged.
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
  where (
      scope = p_scope
      and window_start < now() - make_interval(secs => greatest(p_window_seconds::double precision * 2, 172800))
    )
    or window_start < now() - interval '90 days';

  return next_count <= p_limit;
end;
$$ language plpgsql security definer
set search_path = public, private;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to postgres, service_role;

-- The tidy-up above filters on window_start for every call; without an index
-- that is a scan of the whole table each time.
create index if not exists rate_limits_window_start_idx on private.rate_limits (window_start);
