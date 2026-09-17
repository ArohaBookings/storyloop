import assert from "node:assert/strict";
import test from "node:test";
import { computeMrr, goalProgress, monthlyAmount, mrrMovement, type SubscriptionLike } from "../lib/mrr";

const users = new Set(["u1", "u2", "u3", "u4", "u5"]);

function sub(overrides: Partial<SubscriptionLike> & { plan?: string; userId?: string; cents?: number }): SubscriptionLike {
  const { plan = "educator", userId = "u1", cents = 2100, ...rest } = overrides;
  return {
    id: `sub_${Math.random().toString(36).slice(2)}`,
    status: "active",
    currency: "nzd",
    created: 1_780_000_000,
    metadata: { plan, user_id: userId },
    items: [{ unit_amount: cents, quantity: 1, interval: "month", interval_count: 1 }],
    ...rest,
  };
}

test("real billed amounts, in each subscription's own currency", () => {
  const snapshot = computeMrr(
    [
      sub({ userId: "u1", cents: 2100 }),
      sub({ userId: "u2", plan: "educator_pro", currency: "aud", cents: 2900 }),
      sub({ userId: "u3", plan: "centre_starter", cents: 10900 }),
    ],
    { storyLoopUserIds: users, audToNzd: 1.1 },
  );
  assert.deepEqual(snapshot.active, { NZD: 130, AUD: 29 });
  assert.equal(snapshot.activeNzd, 161.9);
  assert.equal(snapshot.activeCustomers, 3);
  assert.deepEqual(snapshot.byPlan.map((p) => p.plan), ["educator", "educator_pro", "centre_starter"]);
});

test("trials are pipeline, not revenue", () => {
  const snapshot = computeMrr([sub({ status: "trialing" }), sub({ userId: "u2" })], { storyLoopUserIds: users });
  assert.equal(snapshot.activeNzd, 21);
  assert.equal(snapshot.trialingNzd, 21);
  assert.equal(snapshot.activeCustomers, 1);
  assert.equal(snapshot.trialingCustomers, 1);
});

test("other products on the shared Stripe account never count", () => {
  const snapshot = computeMrr(
    [
      sub({ userId: "someone-in-aroha" }),
      sub({ plan: "aroha_starter" }),
      { ...sub({}), metadata: null },
      sub({ currency: "usd" }),
      sub({ status: "canceled" }),
      sub({ status: "incomplete_expired" }),
    ],
    { storyLoopUserIds: users },
  );
  assert.equal(snapshot.activeNzd, 0);
  assert.equal(snapshot.ignored, 4);
});

test("ongoing discounts reduce MRR, one-off first-month discounts do not appear at all", () => {
  assert.equal(monthlyAmount(sub({ cents: 2100, ongoingDiscounts: [{ percent_off: 20, amount_off: null }] })), 16.8);
  assert.equal(monthlyAmount(sub({ cents: 2100, ongoingDiscounts: [{ percent_off: null, amount_off: 500 }] })), 16);
  assert.equal(monthlyAmount(sub({ cents: 2100, ongoingDiscounts: [{ percent_off: 100, amount_off: null }] })), 0);
  assert.equal(monthlyAmount(sub({ cents: 2100 })), 21);
});

test("yearly and multi-seat items are normalised to a month", () => {
  assert.equal(monthlyAmount(sub({ items: [{ unit_amount: 24000, quantity: 1, interval: "year", interval_count: 1 }] })), 20);
  assert.equal(monthlyAmount(sub({ items: [{ unit_amount: 2100, quantity: 3, interval: "month", interval_count: 1 }] })), 63);
});

test("the goal shows the gap and what would close it", () => {
  const progress = goalProgress(2500);
  assert.equal(progress.percent, 25);
  assert.equal(progress.gapNzd, 7500);
  const educator = progress.customersNeeded.find((c) => c.plan === "educator");
  assert.deepEqual(educator, { plan: "educator", priceNzd: 21, customers: 358 });
  assert.equal(goalProgress(12_000).gapNzd, 0);
  assert.equal(goalProgress(12_000).percent, 100);
});

test("movement counts new paying subscriptions and cancellations in the window", () => {
  const since = 1_789_000_000;
  const movement = mrrMovement(
    [
      sub({ created: since + 10 }),
      sub({ created: since + 20, status: "trialing" }),
      sub({ created: since - 10 }),
      sub({ status: "canceled", canceled_at: since + 30, userId: "u2", currency: "aud", cents: 1900 }),
      sub({ status: "canceled", canceled_at: since - 30 }),
    ],
    { storyLoopUserIds: users, sinceSeconds: since, audToNzd: 1.1 },
  );
  assert.deepEqual(movement, { wonNzd: 21, lostNzd: 20.9, netNzd: 0.1, won: 1, lost: 1 });
});

test("Stripe's own cancellation reasons feed the churn panel, StoryLoop only, within the window", async () => {
  const { stripeCancellationRows } = await import("../lib/mrr");
  const { summarizeCancellations } = await import("../lib/churn-reasons");
  const since = 1_780_000_000;
  const rows = stripeCancellationRows(
    [
      sub({ status: "canceled", canceled_at: since + 100, cancellation: { feedback: "too_expensive", comment: null } }),
      sub({ status: "canceled", canceled_at: since + 100, userId: "aroha-user", cancellation: { feedback: "other", comment: "not ours" } }),
      sub({ status: "canceled", canceled_at: since - 100, cancellation: { feedback: "unused", comment: null } }),
      sub({ status: "active" }),
    ],
    { storyLoopUserIds: users, sinceSeconds: since },
  );
  assert.equal(rows.length, 1);
  const summary = summarizeCancellations(rows);
  assert.deepEqual(summary.reasons, [{ key: "too_expensive", label: "Too expensive", count: 1 }]);
  assert.equal(JSON.stringify(summary).includes("not ours"), false);
});

test("a Stripe subscription as the API returns it maps to what MRR needs", async () => {
  const { toSubscriptionLike, computeMrr: compute } = await import("../lib/mrr");
  const now = 1_789_600_000;
  // Shape of a live StoryLoop subscription (ids and user replaced).
  const stripeSubscription = {
    id: "sub_test", status: "active", currency: "aud", created: 1_787_049_375, canceled_at: null, ended_at: null,
    metadata: { activation_offer: "false", currency: "AUD", plan: "educator_pro", referral_discount: "false", user_id: "u1" },
    cancellation_details: { comment: null, feedback: null, reason: null },
    discounts: [
      { id: "di_once", end: null, source: { type: "coupon", coupon: { id: "9AN8qNFe", duration: "once", percent_off: 15, amount_off: null, currency: null } } },
      { id: "di_forever", end: null, source: { type: "coupon", coupon: { id: "c", duration: "forever", percent_off: 10, amount_off: null, currency: null } } },
      { id: "di_expired", end: now - 10, source: { type: "coupon", coupon: { id: "r", duration: "repeating", percent_off: 50, amount_off: null, currency: null } } },
      "di_unexpanded",
    ],
    items: { data: [{ quantity: 1, price: { unit_amount: 2900, recurring: { interval: "month", interval_count: 1 } } }] },
  };
  const like = toSubscriptionLike(stripeSubscription as never, now);
  assert.deepEqual(like.ongoingDiscounts, [{ percent_off: 10, amount_off: null, currency: null }]);
  assert.deepEqual(like.items, [{ unit_amount: 2900, quantity: 1, interval: "month", interval_count: 1 }]);
  const snapshot = compute([like], { storyLoopUserIds: users, audToNzd: 1.1 });
  assert.deepEqual(snapshot.active, { NZD: 0, AUD: 26.1 });
});
