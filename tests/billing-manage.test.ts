import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { cardFrom, isCancellationReason, ownsSubscription, receiptsFrom, subscriptionView, CANCELLATION_REASONS } from "../lib/billing-manage";

const T = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

test("a subscription is only managed by the customer it belongs to", () => {
  assert.equal(ownsSubscription("cus_a", { customer: "cus_a" }), true);
  assert.equal(ownsSubscription("cus_a", { customer: { id: "cus_a" } }), true);
  assert.equal(ownsSubscription("cus_a", { customer: "cus_b" }), false);
  assert.equal(ownsSubscription(null, { customer: "cus_a" }), false);
  assert.equal(ownsSubscription("", { customer: "" }), false);
});

test("card details come from a payment method or an old card source", () => {
  assert.deepEqual(cardFrom({ object: "payment_method", card: { brand: "visa", last4: "4242", exp_month: 4, exp_year: 2030 } }), { brand: "visa", last4: "4242", expMonth: 4, expYear: 2030 });
  assert.deepEqual(cardFrom({ object: "card", brand: "mastercard", last4: "4444", exp_month: 1, exp_year: 2029 }), { brand: "mastercard", last4: "4444", expMonth: 1, expYear: 2029 });
  assert.equal(cardFrom("pm_123"), null);
  assert.equal(cardFrom({ object: "payment_method", card: {} }), null);
  assert.equal(cardFrom(null), null);
});

test("receipts list paid money and anything still owed, never $0 trial invoices or drafts", () => {
  const rows = receiptsFrom([
    { id: "in_paid", number: "SL-1", status: "paid", amount_paid: 2100, amount_due: 2100, currency: "nzd", created: T("2026-09-01T00:00:00Z"), status_transitions: { paid_at: T("2026-09-01T01:00:00Z") } },
    { id: "in_trial", number: "SL-2", status: "paid", amount_paid: 0, amount_due: 0, currency: "nzd", created: T("2026-08-01T00:00:00Z") },
    { id: "in_open", number: "SL-3", status: "open", amount_paid: 0, amount_due: 2100, currency: "nzd", created: T("2026-10-01T00:00:00Z") },
    { id: "in_draft", number: null, status: "draft", amount_paid: 0, amount_due: 2100, currency: "nzd", created: T("2026-10-02T00:00:00Z") },
    { id: "in_void", number: "SL-4", status: "void", amount_paid: 0, amount_due: 2100, currency: "nzd", created: T("2026-10-03T00:00:00Z") },
  ] as never);
  assert.deepEqual(rows.map((row) => [row.id, row.status, row.amount]), [["in_paid", "paid", 2100], ["in_open", "open", 2100]]);
  assert.equal(rows[0].paidAt, "2026-09-01T01:00:00.000Z");
});

function sub(overrides: Partial<Stripe.Subscription> & { periodEnd?: number }): Stripe.Subscription {
  const { periodEnd = T("2026-11-01T00:00:00Z"), ...rest } = overrides;
  return {
    id: "sub_1",
    status: "active",
    currency: "nzd",
    trial_end: null,
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ current_period_end: periodEnd }] },
    ...rest,
  } as unknown as Stripe.Subscription;
}

test("the subscription view says when a cancelled plan ends and drops the next payment", () => {
  const next = { date: "2026-11-01T00:00:00.000Z", amount: 2100, currency: "nzd" };
  const live = subscriptionView(sub({}), next);
  assert.equal(live.endsAt, null);
  assert.deepEqual(live.nextPayment, next);

  const cancelling = subscriptionView(sub({ cancel_at_period_end: true }), next);
  assert.equal(cancelling.endsAt, "2026-11-01T00:00:00.000Z");
  assert.equal(cancelling.nextPayment, null);
  assert.equal(cancelling.cancelAtPeriodEnd, true);

  const dated = subscriptionView(sub({ cancel_at: T("2026-10-25T00:00:00Z") }), next);
  assert.equal(dated.endsAt, "2026-10-25T00:00:00.000Z");

  const trial = subscriptionView(sub({ status: "trialing", trial_end: T("2026-11-09T00:00:00Z") }), null);
  assert.equal(trial.trialEndsAt, "2026-11-09T00:00:00.000Z");
  assert.equal(subscriptionView(sub({ trial_end: T("2026-09-01T00:00:00Z") }), null).trialEndsAt, null, "a past trial is not shown");
});

test("only Stripe's own cancellation reasons are passed on", () => {
  for (const [key] of CANCELLATION_REASONS) assert.equal(isCancellationReason(key), true);
  assert.equal(isCancellationReason("because"), false);
  assert.equal(isCancellationReason(undefined), false);
});
