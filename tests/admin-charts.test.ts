import assert from "node:assert/strict";
import test from "node:test";
import { buildCohorts, countByDay, describeTrend, layoutBars, share } from "../lib/admin-charts";

const TODAY = "2026-09-22";

test("a quiet day is still a day, so a decline cannot look like a plateau", () => {
  const buckets = countByDay(
    ["2026-09-22T09:00:00Z", "2026-09-22T11:00:00Z", "2026-09-19T09:00:00Z"],
    5,
    TODAY,
  );
  assert.deepEqual(buckets.map((b) => b.day), ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"]);
  assert.deepEqual(buckets.map((b) => b.value), [0, 1, 0, 0, 2]);
});

test("events outside the window are not counted", () => {
  const buckets = countByDay(["2026-01-01T00:00:00Z", "2026-09-22T00:00:00Z"], 3, TODAY);
  assert.equal(buckets.reduce((sum, b) => sum + b.value, 0), 1);
});

test("bars always start the scale at zero", () => {
  // A truncated axis exaggerates every change, which is a fine way to feel
  // busy and a terrible way to decide anything.
  const { bars, max } = layoutBars([{ day: "a", value: 100 }, { day: "b", value: 110 }], { width: 200, height: 100 });
  assert.equal(max, 110);
  assert.ok(Math.abs(bars[0].height - (100 / 110) * 100) < 0.01);
  assert.equal(bars[1].height, 100, "the largest bar fills the height");
  // Not 10x taller, which is what a truncated axis would have produced.
  assert.ok(bars[1].height / bars[0].height < 1.2);
});

test("a zero still draws, so an empty day is visibly empty rather than missing", () => {
  const { bars } = layoutBars([{ day: "a", value: 0 }, { day: "b", value: 4 }], { width: 100, height: 50 });
  assert.equal(bars[0].height, 1);
  assert.equal(bars[0].value, 0);
});

test("bars fit inside the box they are given", () => {
  const { bars } = layoutBars(countByDay([], 60, TODAY), { width: 600, height: 160 });
  assert.equal(bars.length, 60);
  assert.ok(bars.every((bar) => bar.x >= 0 && bar.x + bar.width <= 600.01), "no bar may overflow the viewBox");
  assert.ok(bars.every((bar) => bar.y >= 0 && bar.y + bar.height <= 160.01));
  assert.deepEqual(layoutBars([], {}), { bars: [], max: 0 });
});

test("retention counts somebody who paid for part of a month as retained that month", () => {
  const cohorts = buildCohorts({
    today: TODAY,
    months: 12,
    people: [
      // Signed up July, paid from July, still paying.
      { signedUpAt: "2026-07-03", startedPayingAt: "2026-07-10", stoppedPayingAt: null },
      // Signed up July, paid July and August, cancelled in August.
      { signedUpAt: "2026-07-20", startedPayingAt: "2026-07-25", stoppedPayingAt: "2026-08-14" },
      // Signed up July, never paid.
      { signedUpAt: "2026-07-28", startedPayingAt: null, stoppedPayingAt: null },
    ],
  });
  const july = cohorts.find((row) => row.cohort === "2026-07")!;
  assert.equal(july.size, 3);
  // July, August, September.
  assert.deepEqual(july.retained, [2, 2, 1]);
});

test("a cohort that has not finished a month is left short, not padded with zeroes", () => {
  // "Too early to say" and "nobody stayed" are different facts, and only one
  // of them is bad news.
  const cohorts = buildCohorts({
    today: TODAY,
    months: 12,
    people: [{ signedUpAt: "2026-09-02", startedPayingAt: "2026-09-02", stoppedPayingAt: null }],
  });
  const september = cohorts.find((row) => row.cohort === "2026-09")!;
  assert.equal(september.retained.length, 1, "one month elapsed, one column");
  assert.deepEqual(september.retained, [1]);
});

test("cohorts come back newest first and older than the window is dropped", () => {
  const cohorts = buildCohorts({
    today: TODAY,
    months: 3,
    people: [
      { signedUpAt: "2026-09-01", startedPayingAt: null, stoppedPayingAt: null },
      { signedUpAt: "2026-08-01", startedPayingAt: null, stoppedPayingAt: null },
      { signedUpAt: "2025-01-01", startedPayingAt: null, stoppedPayingAt: null },
    ],
  });
  assert.deepEqual(cohorts.map((row) => row.cohort), ["2026-09", "2026-08"]);
});

test("percentages never divide by zero or invent precision", () => {
  assert.equal(share(1, 3), 33);
  assert.equal(share(0, 0), 0);
  assert.equal(share(5, 0), 0);
  assert.equal(share(2, 2), 100);
});

test("a trend refuses to be announced from a handful of events", () => {
  // At these volumes two signups is noise, and a dashboard that shouts
  // "up 100%" about it teaches its reader to ignore it.
  assert.match(describeTrend(2, 1), /Too few to call/);
  assert.match(describeTrend(60, 30), /Up 100%/);
  assert.match(describeTrend(30, 60), /Down 50%/);
  assert.match(describeTrend(52, 50), /About the same/);
  assert.match(describeTrend(40, 0), /Up from nothing/);
  assert.match(describeTrend(0, 0, 0), /Still nothing/);
});
