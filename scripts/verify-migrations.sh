#!/usr/bin/env bash
#
# Execute new migrations against a THROWAWAY local Postgres and run their tests.
#
#   npm run verify:migrations
#
# Why this exists: migrations are the one part of StoryLoop that never runs in
# the normal test suite, and a broken one is only discovered when it is applied
# to the live database. This creates a disposable cluster in a temp directory,
# on a port it has checked is free, applies a minimal Supabase-shaped stub, runs
# each migration TWICE (to prove it is idempotent), runs the SQL tests, and then
# deletes the whole cluster. It never connects to any existing database.
#
# Needs a local PostgreSQL 16 (brew install postgresql@16). Skips cleanly, with
# exit code 0 and a clear message, if Postgres is not installed.

set -euo pipefail
export LC_ALL=C LANG=C

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-}"
if [[ -z "$PG_BIN" ]]; then
  for candidate in /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@16/bin /usr/lib/postgresql/16/bin; do
    if [[ -x "$candidate/postgres" ]]; then PG_BIN="$candidate"; break; fi
  done
fi
if [[ -z "$PG_BIN" && -x "$(command -v postgres 2>/dev/null)" ]]; then PG_BIN="$(dirname "$(command -v postgres)")"; fi
if [[ -z "$PG_BIN" ]]; then
  echo "verify-migrations: PostgreSQL not found, skipping. Install with: brew install postgresql@16"
  exit 0
fi

# Migrations under test, in order. Add new ones here.
MIGRATIONS=(
  "supabase/migrations/20260917_centre_team_model.sql"
  "supabase/migrations/20260917_admin_system_health.sql"
  "supabase/migrations/20260917_webhook_stale_lock_recovery.sql"
)
TESTS=(
  "supabase/tests/centre_team_model.test.sql"
  "supabase/tests/webhook_recovery.test.sql"
)

# A free port, checked rather than assumed: another project's database may be
# listening on any given one, and tests must never run against it.
PORT=""
for candidate in $(seq 58400 58499); do
  if ! (echo >"/dev/tcp/127.0.0.1/$candidate") 2>/dev/null; then PORT="$candidate"; break; fi
done
[[ -n "$PORT" ]] || { echo "verify-migrations: no free port in 58400-58499"; exit 1; }

WORK="$(mktemp -d "${TMPDIR:-/tmp}/storyloop-migrations.XXXXXX")"
cleanup() {
  "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$WORK/data" -U verifier --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$WORK/data" -l "$WORK/postgres.log" \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start >/dev/null

for _ in $(seq 1 30); do
  "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1 && break
  sleep 0.2
done

psql_run() {
  "$PG_BIN/psql" -h 127.0.0.1 -p "$PORT" -U verifier -d verify -v ON_ERROR_STOP=1 -q "$@"
}

# Guard against the one mistake that would matter: confirm this is our cluster.
"$PG_BIN/createdb" -h 127.0.0.1 -p "$PORT" -U verifier verify
# Compare PHYSICAL paths: macOS TMPDIR ends in a slash and /var is a symlink to
# /private/var, so the same directory can be spelled several ways.
DATA_DIR="$(psql_run -tAc "select current_setting('data_directory')")"
EXPECTED="$(cd "$WORK/data" && pwd -P)"
ACTUAL="$(cd "$DATA_DIR" 2>/dev/null && pwd -P || echo "$DATA_DIR")"
[[ "$ACTUAL" == "$EXPECTED" ]] \
  || { echo "verify-migrations: connected to an unexpected cluster ($ACTUAL, expected $EXPECTED), aborting"; exit 1; }

cd "$ROOT"
psql_run -f supabase/tests/stub_supabase.sql >/dev/null 2>"$WORK/err" || { cat "$WORK/err"; echo "FAIL applying the Supabase stub"; exit 1; }

for migration in "${MIGRATIONS[@]}"; do
  psql_run -f "$migration" >/dev/null 2>"$WORK/err" || { cat "$WORK/err"; echo "FAIL applying $migration"; exit 1; }
  psql_run -f "$migration" >/dev/null 2>"$WORK/err" || { cat "$WORK/err"; echo "FAIL re-applying $migration (not idempotent)"; exit 1; }
  echo "  ok  $migration (applies, and re-applies)"
done

for test_file in "${TESTS[@]}"; do
  output="$(psql_run -f "$test_file" 2>&1)" || { echo "$output"; echo "FAIL $test_file"; exit 1; }
  echo "  ok  $test_file — $(echo "$output" | grep -o 'all [0-9]* checks passed' || echo 'passed')"
done

# The race that the stale lock fix exists to prevent: many simultaneous retries
# reclaiming one abandoned event. Exactly one may win, every round.
for round in 1 2 3; do
  psql_run -c "delete from private.stripe_webhook_events where event_id = 'evt_race'" \
           -c "insert into private.stripe_webhook_events values ('evt_race', 'invoice.paid', 'processing', now() - interval '30 minutes', null)" >/dev/null
  for i in $(seq 1 8); do
    ( psql_run -tAc "select public.begin_stripe_webhook_event('evt_race', 'invoice.paid')" >"$WORK/race_$i" 2>&1 ) &
  done
  wait
  winners="$(cat "$WORK"/race_* | grep -c '^process$' || true)"
  if [[ "$winners" != "1" ]]; then
    echo "FAIL webhook race round $round: $winners concurrent reclaims won, expected exactly 1"
    exit 1
  fi
done
echo "  ok  webhook reclaim race — exactly 1 of 8 simultaneous retries wins, 3 rounds"

echo "verify-migrations: all migrations and SQL tests passed"
