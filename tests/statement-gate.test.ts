import assert from "node:assert/strict";
import test from "node:test";
import { gateDecision, gateRefusal, isTrialingIndividual } from "../lib/statement-gate";

const trialing = { plan: "educator", subscription_status: "trialing", stripe_subscription_id: "sub_1", applied_access_code: null };

test("switch off: the gate always hands the request to the protected route", () => {
  for (const hourOk of [true, false]) for (const dayOk of [true, false]) {
    assert.equal(gateDecision({ switchOn: false, trialing: true, hourOk, dayOk }), "delegate");
  }
});

test("a free account is never counted here: the protected route counts it as before", () => {
  assert.equal(isTrialingIndividual({ ...trialing, plan: "free", subscription_status: "free", stripe_subscription_id: null }), false);
  assert.equal(gateDecision({ switchOn: true, trialing: false, hourOk: false, dayOk: false }), "delegate");
});

test("a trialing educator within 3 an hour and 9 a day goes through; past either, the pay-today refusal", () => {
  assert.equal(isTrialingIndividual(trialing), true);
  assert.equal(isTrialingIndividual({ ...trialing, plan: "educator_pro" }), true);
  assert.equal(gateDecision({ switchOn: true, trialing: true, hourOk: true, dayOk: true }), "delegate");
  assert.equal(gateDecision({ switchOn: true, trialing: true, hourOk: false }), "hour_limit");
  assert.equal(gateDecision({ switchOn: true, trialing: true, hourOk: true, dayOk: false }), "day_limit");
  const hour = gateRefusal("hour_limit", { hour: 3, day: 9 });
  assert.deepEqual({ code: hour.code, limit: hour.limit, payToday: hour.payToday }, { code: "free_limit", limit: "hour", payToday: true });
  assert.equal(gateRefusal("day_limit", { hour: 3, day: 9 }).limit, "day");
  for (const r of [hour, gateRefusal("day_limit", { hour: 3, day: 9 })]) assert.doesNotMatch(r.error, /—/);
});

test("never a trialing individual: a centre plan, an access code, no subscription, a paying or cancelled account", () => {
  assert.equal(isTrialingIndividual({ ...trialing, plan: "centre_starter" }), false);
  assert.equal(isTrialingIndividual({ ...trialing, applied_access_code: "TEAM" }), false);
  assert.equal(isTrialingIndividual({ ...trialing, stripe_subscription_id: null }), false);
  assert.equal(isTrialingIndividual({ ...trialing, subscription_status: "active" }), false);
  assert.equal(isTrialingIndividual({ ...trialing, subscription_status: "canceled" }), false);
  assert.equal(isTrialingIndividual(null), false);
});

test("the gate reads her OWN profile, so a member covered by a trialing centre is never walled", async () => {
  const { readFileSync } = await import("node:fs");
  const server = readFileSync("lib/statement-gate-server.ts", "utf8");
  assert.match(server, /getOrCreateProfile\(user\)/);
  assert.doesNotMatch(server, /getAccessProfile/);
  // The same counters the protected routes use for a free account, so a trial and a free account share one count.
  assert.match(server, /scope: "child-statement-free", key: user\.id, limit: STATEMENT_FREE_LIMIT, windowSeconds: STATEMENT_FREE_WINDOW_SECONDS/);
  assert.match(server, /scope: "child-statement-free-day", key: user\.id, limit: STATEMENT_FREE_DAY_LIMIT, windowSeconds: 86_400/);
});

// R1-2 (25 Nov review): the free month of Educator Pro is not the free week.
import { isFreeWeekProfile } from "../lib/statement-gate";
test("the free month of Pro, or any trial more than a week from its end, is not gated as the free week", () => {
  const now = new Date("2026-12-01T00:00:00Z");
  const p = { plan: "educator", subscription_status: "trialing", stripe_subscription_id: "sub_1", applied_access_code: null, trial_ends_at: "2026-12-06T00:00:00Z" };
  assert.equal(isFreeWeekProfile(p, { now, proMonthSubscriptionId: null }), true);
  assert.equal(isFreeWeekProfile({ ...p, trial_ends_at: "2026-12-25T00:00:00Z" }, { now, proMonthSubscriptionId: null }), false, "30-day trial");
  assert.equal(isFreeWeekProfile({ ...p, plan: "educator_pro" }, { now, proMonthSubscriptionId: "sub_1" }), false, "last week of the Pro month");
  assert.equal(isFreeWeekProfile(p, { now, proMonthSubscriptionId: "sub_other" }), true);
  assert.equal(isFreeWeekProfile({ ...p, subscription_status: "active" }, { now, proMonthSubscriptionId: null }), false);
});
