import assert from "node:assert/strict";
import test from "node:test";
import { formatAmount, formatDate, newlyScheduledCancellation, paymentFailureNotice } from "../lib/email/billing";
import { renderLifecycleEmail } from "../lib/email/templates";

/**
 * These two functions produce the only numbers a customer reads in a receipt.
 * Getting a cents/dollars conversion wrong would bill someone NZ$2100.00 in
 * writing for a NZ$21.00 charge, so they are pinned here.
 */

test("amounts convert from cents and carry the right currency prefix", () => {
  assert.equal(formatAmount(2100, "nzd"), "NZ$21.00");
  assert.equal(formatAmount(1900, "aud"), "A$19.00");
  assert.equal(formatAmount(2900, "AUD"), "A$29.00");
  assert.equal(formatAmount(1599, "usd"), "US$15.99");
});

test("an unknown currency still renders readably rather than lying about it", () => {
  assert.equal(formatAmount(1000, "gbp"), "GBP 10.00");
});

test("currency defaults to NZD when Stripe omits it", () => {
  assert.equal(formatAmount(2100, null), "NZ$21.00");
  assert.equal(formatAmount(2100, undefined), "NZ$21.00");
});

test("amounts that are not real numbers return null instead of NaN", () => {
  assert.equal(formatAmount(null, "nzd"), null);
  assert.equal(formatAmount(undefined, "nzd"), null);
  assert.equal(formatAmount(Number.NaN, "nzd"), null);
  assert.equal(formatAmount(Number.POSITIVE_INFINITY, "nzd"), null);
});

test("a zero invoice still formats, so the caller decides whether to send", () => {
  // The zero-amount decision belongs in sendBillingEmail, not here: a trial
  // starting is a real event, it is just not a payment worth thanking someone
  // for. Formatting must not quietly swallow it.
  assert.equal(formatAmount(0, "nzd"), "NZ$0.00");
});

test("rounding does not drop a cent", () => {
  assert.equal(formatAmount(2199, "nzd"), "NZ$21.99");
  assert.equal(formatAmount(1, "nzd"), "NZ$0.01");
  assert.equal(formatAmount(21900, "nzd"), "NZ$219.00");
});

test("dates render the way an educator reads them, not as a unix timestamp", () => {
  // 2026-10-14T00:00:00Z
  const formatted = formatDate(1791244800);
  assert.ok(formatted, "expected a formatted date");
  assert.match(formatted, /2026/);
  assert.match(formatted, /October/);
});

test("missing or invalid dates return null rather than 'Invalid Date'", () => {
  assert.equal(formatDate(null), null);
  assert.equal(formatDate(undefined), null);
  assert.equal(formatDate(Number.NaN), null);
});

test("a failed payment with a retry left gets the first notice, keyed on the invoice", () => {
  assert.deepEqual(paymentFailureNotice("in_123", "2026-09-20T00:00:00.000Z"), { type: "payment_failed", billingKey: "in_123" });
  assert.deepEqual(paymentFailureNotice("in_123", 1790000000), { type: "payment_failed", billingKey: "in_123" });
});

test("the final failed attempt gets its own notice under a different key, so it is never deduped away", () => {
  const final = paymentFailureNotice("in_123", null);
  assert.equal(final.type, "payment_failed_final");
  assert.equal(final.billingKey, "in_123:final");
  assert.notEqual(final.billingKey, paymentFailureNotice("in_123", "2026-09-20").billingKey);
  assert.equal(paymentFailureNotice("in_123", undefined).type, "payment_failed_final");
  assert.equal(paymentFailureNotice("in_123", "").type, "payment_failed_final");
});

test("the final notice is transactional, branded, and states the real consequence", () => {
  const email = renderLifecycleEmail({
    type: "payment_failed_final",
    userId: "00000000-0000-0000-0000-000000000001",
    recipient: "kaiako@example.com",
    name: "Aroha Smith",
  });
  assert.equal(email.marketing, false, "must reach people who unsubscribed from tips");
  assert.match(email.html, /images\/logo-email\.png/);
  assert.match(email.html, /Hi Aroha,/);
  // Matches lib/billing-access.ts: new stories stop, saved stories stay usable.
  assert.match(email.text, /still open, read and edit every story/);
  assert.match(email.ctaUrl, /\/billing\?/);
  for (const junk of ["undefined", "NaN", "null", "${"]) assert.ok(!email.html.includes(junk), `leaked ${junk}`);
});

const PERIOD_END = 1791244800; // 2026-10-14

test("cancelling in the portal is detected whichever field Stripe uses", () => {
  const atPeriodEnd = newlyScheduledCancellation(
    { id: "sub_1", status: "active", cancel_at_period_end: true, cancel_at: null },
    { cancel_at_period_end: false, canceled_at: null },
    PERIOD_END,
  );
  assert.deepEqual(atPeriodEnd, { billingKey: `sub_1:cancel_scheduled:${PERIOD_END}`, endsAtSeconds: PERIOD_END });

  const withCancelAt = newlyScheduledCancellation(
    { id: "sub_1", status: "active", cancel_at_period_end: false, cancel_at: PERIOD_END },
    { cancel_at: null },
    null,
  );
  assert.deepEqual(withCancelAt, { billingKey: `sub_1:cancel_scheduled:${PERIOD_END}`, endsAtSeconds: PERIOD_END });

  // Both at once, as newer API versions send it.
  const both = newlyScheduledCancellation(
    { id: "sub_1", status: "trialing", cancel_at_period_end: true, cancel_at: PERIOD_END },
    { cancel_at_period_end: false, cancel_at: null },
    PERIOD_END,
  );
  assert.equal(both?.endsAtSeconds, PERIOD_END);
});

test("updates that are not a new cancellation send nothing", () => {
  const scheduled = { id: "sub_1", status: "active", cancel_at_period_end: true, cancel_at: PERIOD_END };
  // A renewal or plan change that does not touch cancellation.
  assert.equal(newlyScheduledCancellation(scheduled, { items: {} }, PERIOD_END), null);
  // No previous attributes at all (subscription.created, resumed).
  assert.equal(newlyScheduledCancellation(scheduled, undefined, PERIOD_END), null);
  // Already scheduled; only the date moved.
  assert.equal(newlyScheduledCancellation(scheduled, { cancel_at: PERIOD_END - 86400 }, PERIOD_END), null);
  // They undid the cancellation: keeping the plan is not a cancellation.
  assert.equal(
    newlyScheduledCancellation({ id: "sub_1", status: "active", cancel_at_period_end: false, cancel_at: null }, { cancel_at_period_end: true, cancel_at: PERIOD_END }, PERIOD_END),
    null,
  );
  // Already ended: subscription_cancelled handles that.
  assert.equal(
    newlyScheduledCancellation({ ...scheduled, status: "canceled" }, { cancel_at_period_end: false, cancel_at: null }, PERIOD_END),
    null,
  );
});

test("cancel, undo and cancel again in the same period shares one key", () => {
  const first = newlyScheduledCancellation({ id: "sub_1", status: "active", cancel_at_period_end: true, cancel_at: null }, { cancel_at_period_end: false }, PERIOD_END);
  const again = newlyScheduledCancellation({ id: "sub_1", status: "active", cancel_at_period_end: true, cancel_at: null }, { cancel_at_period_end: false }, PERIOD_END);
  assert.equal(first?.billingKey, again?.billingKey);
  const nextPeriod = newlyScheduledCancellation({ id: "sub_1", status: "active", cancel_at_period_end: true, cancel_at: null }, { cancel_at_period_end: false }, PERIOD_END + 30 * 86400);
  assert.notEqual(first?.billingKey, nextPeriod?.billingKey);
});

const junk = ["undefined", "NaN", "null", "${"];

test("the cancellation save email states the real consequence and promises nothing we do not offer", () => {
  const email = renderLifecycleEmail({
    type: "cancellation_scheduled",
    userId: "00000000-0000-0000-0000-000000000001",
    recipient: "kaiako@example.com",
    name: "Aroha Smith",
    context: { planLabel: "Educator Pro", endsOn: "14 October 2026" },
  });
  assert.equal(email.marketing, false, "a reply to their own action must reach them");
  assert.equal(email.subject, "Your StoryLoop plan ends on 14 October 2026");
  assert.match(email.html, /images\/logo-email\.png/);
  assert.match(email.text, /everything keeps working until 14 October 2026/);
  // Matches lib/story-limits.ts and lib/billing-access.ts after the plan ends.
  assert.match(email.text, /free plan/);
  assert.match(email.text, /3 new stories a month/);
  assert.match(email.ctaUrl, /\/billing\?/);
  assert.doesNotMatch(email.html + email.text, /pause|discount|% off/i);
  for (const bad of junk) assert.ok(!email.html.includes(bad) && !email.text.includes(bad), `leaked ${bad}`);

  const undated = renderLifecycleEmail({ type: "cancellation_scheduled", userId: "u", recipient: "a@example.com", name: null });
  assert.equal(undated.subject, "Your StoryLoop plan is set to end");
  assert.match(undated.text, /until the end of your billing period/);
  for (const bad of junk) assert.ok(!undated.html.includes(bad) && !undated.text.includes(bad), `leaked ${bad}`);
});

test("the ended email no longer offers a pause that does not exist", () => {
  const email = renderLifecycleEmail({
    type: "subscription_cancelled",
    userId: "00000000-0000-0000-0000-000000000001",
    recipient: "kaiako@example.com",
    name: "Aroha Smith",
  });
  assert.equal(email.marketing, false);
  assert.doesNotMatch(email.html + email.text, /pause/i);
  assert.match(email.text, /free plan/);
  assert.match(email.text, /3 new stories a month/);
  for (const bad of junk) assert.ok(!email.html.includes(bad), `leaked ${bad}`);
});

test("the win-back email offers only the discount checkout really applies", async () => {
  const { ACTIVATION_OFFER_LABEL } = await import("../lib/email/config");
  const email = renderLifecycleEmail({
    type: "winback_offer",
    userId: "00000000-0000-0000-0000-000000000001",
    recipient: "kaiako@example.com",
    name: "Aroha Smith",
  });
  // /api/stripe/checkout applies the activation coupon only for ?offer=activation.
  assert.match(email.ctaUrl, /\/billing\?offer=activation/);
  assert.ok(email.text.includes(ACTIVATION_OFFER_LABEL));
  assert.ok(email.subject.includes(ACTIVATION_OFFER_LABEL));
  // There has never been a 20% StoryLoop win-back coupon.
  assert.doesNotMatch(email.subject + email.html + email.text, /20%/);
  assert.equal(email.marketing, true, "a win-back is marketing and must respect unsubscribes");
  for (const bad of junk) assert.ok(!email.html.includes(bad) && !email.text.includes(bad), `leaked ${bad}`);
});
