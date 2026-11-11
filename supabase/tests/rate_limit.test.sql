-- A rate limit's count must outlive its window.
--
-- The free allowance for a statement or summary is two in 30 days. Until 12 Nov
-- 2026 the limiter deleted every row whose window began more than two days ago,
-- so a long window's count was wiped on nearly every call and the third, fourth
-- and hundredth draft were all allowed. These checks hold a long window to its
-- count whenever in that window they happen to run.

-- The table comes from 20260615_learning_loop_profiles.sql, which this checker
-- does not replay. Same definition, made only if it is missing.
create schema if not exists private;
create table if not exists private.rate_limits (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (scope, key_hash, window_start)
);

delete from private.rate_limits where scope like 'test-%';

do $$
declare
  checks integer := 0;
  day integer := 86400;
  long_window integer := 60 * 86400;  -- starts up to 60 days ago, whatever today is
  -- A window that began 30 days ago: the case the old tidy-up destroyed.
  old_start timestamptz := to_timestamp(floor(extract(epoch from now()) / (60 * 86400)) * (60 * 86400));
begin
  -- 1-3. Two are allowed and the third is refused, in a long window.
  assert public.consume_rate_limit('test-long', 'k1', long_window, 2), '1 the first call in a long window is allowed';
  checks := checks + 1;
  assert public.consume_rate_limit('test-long', 'k1', long_window, 2), '2 the second call is allowed';
  checks := checks + 1;
  assert not public.consume_rate_limit('test-long', 'k1', long_window, 2), '3 the third call in a long window must be refused';
  checks := checks + 1;

  -- 4. A call on some OTHER limit does not wipe the long window's count.
  perform public.consume_rate_limit('test-short', 'k9', 60, 5);
  assert (select request_count from private.rate_limits where scope = 'test-long' and key_hash = 'k1') = 3,
    '4 another limit being used must not delete this limit''s count';
  checks := checks + 1;

  -- 5. A count from a window that began long ago, but is still the current one, is kept and counted.
  delete from private.rate_limits where scope = 'test-aged';
  insert into private.rate_limits (scope, key_hash, window_start, request_count) values ('test-aged', 'k2', old_start, 2);
  assert not public.consume_rate_limit('test-aged', 'k2', long_window, 2),
    '5 a count already at its limit must refuse the next call, however long ago the window began';
  checks := checks + 1;

  -- 6. A different person is not held to somebody else's count.
  assert public.consume_rate_limit('test-long', 'somebody-else', long_window, 2), '6 each key has its own count';
  checks := checks + 1;

  -- 7. Rows that can never matter again are still tidied away: a short limit's rows after two days.
  insert into private.rate_limits (scope, key_hash, window_start, request_count) values ('test-short', 'stale', now() - interval '3 days', 4);
  perform public.consume_rate_limit('test-short', 'k9', 60, 5);
  assert not exists (select 1 from private.rate_limits where scope = 'test-short' and key_hash = 'stale'),
    '7 a short limit''s old rows must still be removed';
  checks := checks + 1;

  -- 8. And anything older than 90 days goes, whichever limit it belonged to.
  insert into private.rate_limits (scope, key_hash, window_start, request_count) values ('test-forgotten', 'old', now() - interval '120 days', 1);
  perform public.consume_rate_limit('test-short', 'k9', 60, 5);
  assert not exists (select 1 from private.rate_limits where scope = 'test-forgotten'), '8 rows older than 90 days must be removed';
  checks := checks + 1;

  -- 9. Nonsense limits are refused, as before.
  assert not public.consume_rate_limit('test-long', 'k1', 0, 2) and not public.consume_rate_limit('test-long', 'k1', day, 0),
    '9 a window or a limit below one must be refused';
  checks := checks + 1;

  raise notice 'all % checks passed', checks;
end $$;

delete from private.rate_limits where scope like 'test-%';
