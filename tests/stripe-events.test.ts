import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, stripeEventFacts } from "../lib/stripe-events";

const USER = "7a1f3c2e-9b1d-4c7e-8f00-123456789abc";

test("a StoryLoop checkout: owner, plan and a plain summary", () => {
  const facts = stripeEventFacts({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { object: "checkout.session", customer: "cus_1", subscription: "sub_1", amount_total: 0, currency: "nzd", metadata: { user_id: USER, plan: "educator_pro", app: "storyloop" } } },
  });
  assert.equal(facts.userId, USER);
  assert.equal(facts.customerId, "cus_1");
  assert.equal(facts.subscriptionId, "sub_1");
  assert.equal(facts.plan, "educator_pro");
  assert.equal(facts.summary, "Finished checkout for Educator Pro");
});

test("another business's event has no StoryLoop owner to find", () => {
  const facts = stripeEventFacts({
    id: "evt_2",
    type: "invoice.paid",
    data: { object: { object: "invoice", customer: "cus_other", amount_paid: 4900, currency: "nzd", metadata: { user_id: "usr_9981" } } },
  });
  // Not a UUID, so it can never be matched against (or crash) a profiles lookup.
  assert.equal(facts.userId, null);
  assert.equal(facts.customerId, "cus_other");
  assert.equal(facts.summary, "Paid NZ$49.00");
});

test("an invoice carries its subscription's owner under parent.subscription_details", () => {
  const facts = stripeEventFacts({
    id: "evt_3",
    type: "invoice.payment_failed",
    data: { object: { object: "invoice", customer: "cus_1", amount_due: 3300, currency: "nzd", attempt_count: 2, next_payment_attempt: null, parent: { subscription_details: { subscription: "sub_1", metadata: { user_id: USER, plan: "educator_pro" } } } } },
  });
  assert.equal(facts.userId, USER);
  assert.equal(facts.subscriptionId, "sub_1");
  assert.equal(facts.summary, "Card payment of NZ$33.00 failed (attempt 2), no retries left");
});

test("subscription changes read like a person wrote them", () => {
  const sub = { object: "subscription", id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: true, cancel_at: 1790000000, currency: "aud", metadata: { user_id: USER, plan: "educator" }, items: { data: [{ price: { unit_amount: 1900 }, current_period_end: 1790000000 }] } };
  const cancelled = stripeEventFacts({ id: "e", type: "customer.subscription.updated", data: { object: sub, previous_attributes: { cancel_at_period_end: false } } });
  assert.match(cancelled.summary, /^Cancelled Educator, keeps access until /);
  const converted = stripeEventFacts({ id: "e", type: "customer.subscription.updated", data: { object: { ...sub, cancel_at_period_end: false }, previous_attributes: { status: "trialing" } } });
  assert.equal(converted.summary, "Trial turned into a paid Educator plan");
  assert.equal(converted.amount, 1900);
  assert.equal(formatMoney(1900, "aud"), "A$19.00");
});

test("disputes and refunds say what to do", () => {
  const dispute = stripeEventFacts({ id: "e", type: "charge.dispute.created", data: { object: { object: "dispute", amount: 3300, currency: "nzd", charge: "ch_1" } } });
  assert.equal(dispute.summary, "Opened a dispute for NZ$33.00. Respond in Stripe before the deadline");
  const refund = stripeEventFacts({ id: "e", type: "charge.refunded", data: { object: { object: "charge", customer: "cus_1", amount: 3300, amount_refunded: 3300, currency: "nzd" } } });
  assert.equal(refund.summary, "Refunded NZ$33.00");
});
