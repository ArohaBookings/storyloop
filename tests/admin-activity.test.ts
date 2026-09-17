import assert from "node:assert/strict";
import test from "node:test";
import { accountSignals, weeklyBuckets } from "../lib/admin-activity";

const NOW = new Date("2026-09-17T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

test("weekly buckets put each story in the right rolling week, oldest first", () => {
  const buckets = weeklyBuckets([daysAgo(0), daysAgo(3), daysAgo(8), daysAgo(20)], 4, NOW);
  assert.deepEqual(buckets, [0, 1, 1, 2]);
});

test("weekly buckets ignore stories outside the window, in the future, or unparseable", () => {
  const buckets = weeklyBuckets([daysAgo(100), daysAgo(-2), "not a date", null, undefined, daysAgo(1)], 4, NOW);
  assert.deepEqual(buckets, [0, 0, 0, 1]);
});

test("weekly buckets total never exceeds the stories given", () => {
  const dates = Array.from({ length: 50 }, (_, i) => daysAgo(i));
  const total = weeklyBuckets(dates, 12, NOW).reduce((a, b) => a + b, 0);
  assert.equal(total, 50);
});

test("zero or negative weeks returns an empty chart instead of throwing", () => {
  assert.deepEqual(weeklyBuckets([daysAgo(1)], 0, NOW), []);
  assert.deepEqual(weeklyBuckets([daysAgo(1)], -3, NOW), []);
});

const baseSignal = {
  plan: "educator", subscriptionStatus: "active", isActive: true, chargedWhileComped: false,
  storyCount: 10, lastStoryAt: daysAgo(2), now: NOW,
};

test("being charged while comped is always the first, critical signal", () => {
  const signals = accountSignals({ ...baseSignal, chargedWhileComped: true, storyCount: 0 });
  assert.equal(signals[0].tone, "critical");
  assert.match(signals[0].text, /Stripe/);
});

test("a paying customer who never wrote a story is flagged as a cancellation risk", () => {
  const signals = accountSignals({ ...baseSignal, storyCount: 0, lastStoryAt: null });
  assert.ok(signals.some((s) => s.tone === "warn" && /never written a story/.test(s.text)));
});

test("a free account that never wrote is informational, not a warning", () => {
  const signals = accountSignals({ ...baseSignal, plan: "free", subscriptionStatus: "free", storyCount: 0, lastStoryAt: null });
  assert.ok(signals.every((s) => s.tone !== "warn" && s.tone !== "critical"));
});

test("payment problems and a disabled login are surfaced", () => {
  const signals = accountSignals({ ...baseSignal, subscriptionStatus: "past_due", isActive: false });
  assert.ok(signals.some((s) => /Payment problem/.test(s.text)));
  assert.ok(signals.some((s) => /disabled/.test(s.text)));
});

test("recent activity reads as good; a month of silence reads as a warning for a payer", () => {
  assert.ok(accountSignals(baseSignal).some((s) => s.tone === "good"));
  assert.ok(accountSignals({ ...baseSignal, lastStoryAt: daysAgo(45) }).some((s) => s.tone === "warn" && /45 days/.test(s.text)));
});
