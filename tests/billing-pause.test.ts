import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { createPauseToken, pausePayments, pauseResumesAt, pauseViewOf, restartPayments, verifyPauseToken, PAUSE_LINK_DAYS } from "../lib/billing-pause";
import { createUnsubscribeToken } from "../lib/email/unsubscribe";

const T = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const NOW = T("2026-10-19T00:00:00Z");

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    currency: "nzd",
    cancel_at_period_end: false,
    cancel_at: null,
    pause_collection: null,
    items: { data: [{ current_period_end: T("2026-10-21T09:36:00Z"), price: { unit_amount: 2100, currency: "nzd" } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function fakeStripe(current: Stripe.Subscription) {
  const calls: Array<Record<string, unknown>> = [];
  let state = current;
  const stripe = {
    subscriptions: {
      retrieve: async () => state,
      list: async () => ({ data: [state] }),
      update: async (_id: string, params: Record<string, unknown>) => {
        calls.push(params);
        const pc = params.pause_collection;
        state = { ...state, pause_collection: pc === "" ? null : pc } as Stripe.Subscription;
        return state;
      },
    },
  } as unknown as Stripe;
  return { stripe, calls };
}

test("a pause link verifies for its owner, expires after 30 days, and cannot be forged", () => {
  const token = createPauseToken("user-1", NOW);
  assert.deepEqual(verifyPauseToken(token, NOW + 60), { userId: "user-1", exp: NOW + PAUSE_LINK_DAYS * 86400 });
  assert.equal(verifyPauseToken(token, NOW + PAUSE_LINK_DAYS * 86400 + 1), null, "expired");
  const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  const swapped = Buffer.from(JSON.stringify({ ...decoded, userId: "user-2" })).toString("base64url");
  assert.equal(verifyPauseToken(swapped, NOW), null, "someone else's account");
  const extended = Buffer.from(JSON.stringify({ ...decoded, exp: decoded.exp + 999999 })).toString("base64url");
  assert.equal(verifyPauseToken(extended, NOW), null, "longer expiry");
  assert.equal(verifyPauseToken(createUnsubscribeToken("user-1", "a@b.com"), NOW), null, "an unsubscribe link is not a pause link");
  for (const junk of ["", "x", "%%%", "e30", null, undefined]) assert.equal(verifyPauseToken(junk as string, NOW), null);
});

test("pausing skips exactly the chosen number of payments", () => {
  const end = T("2026-10-21T09:36:00Z");
  assert.equal(new Date(pauseResumesAt(end, 1) * 1000).toISOString(), "2026-11-20T09:36:00.000Z");
  assert.equal(new Date(pauseResumesAt(end, 3) * 1000).toISOString(), "2027-01-20T09:36:00.000Z");
  // 31 Jan + 1 month is 28 Feb, a day before that is 27 Feb, never March.
  assert.equal(new Date(pauseResumesAt(T("2027-01-31T00:00:00Z"), 1) * 1000).toISOString(), "2027-02-27T00:00:00.000Z");
});

test("the page offers a pause only where one makes sense", () => {
  assert.equal(pauseViewOf(sub()).status, "can_pause");
  assert.equal(pauseViewOf(sub()).options.length, 3);
  assert.equal(pauseViewOf(sub({ cancel_at_period_end: true })).status, "cancelling");
  assert.equal(pauseViewOf(sub({ status: "trialing" })).status, "not_pausable");
  assert.equal(pauseViewOf(sub({ status: "past_due" })).status, "not_pausable");
  assert.equal(pauseViewOf(sub({ pause_collection: { behavior: "void", resumes_at: T("2026-11-20T09:36:00Z") } })).status, "paused");
  assert.equal(pauseViewOf(null).status, "no_subscription");
  const v = pauseViewOf(sub());
  assert.equal(v.amount, 2100);
  assert.equal(v.currency, "nzd");
});

test("pause voids the skipped invoices and restart clears it", async () => {
  const { stripe, calls } = fakeStripe(sub());
  const paused = await pausePayments(stripe, { customerId: "cus_1", subscriptionId: "sub_1", months: 1 });
  assert.equal(paused.ok, true);
  assert.deepEqual(calls[0].pause_collection, { behavior: "void", resumes_at: T("2026-11-20T09:36:00Z") });
  assert.equal(paused.ok && paused.view.status, "paused");

  const again = await pausePayments(stripe, { customerId: "cus_1", subscriptionId: "sub_1", months: 2 });
  assert.deepEqual(again, { ok: false, reason: "already_paused" }, "a second pause never stacks");

  const restarted = await restartPayments(stripe, { customerId: "cus_1", subscriptionId: "sub_1" });
  assert.equal(restarted.ok, true);
  assert.equal(calls.at(-1)?.pause_collection, "");
  assert.equal(restarted.ok && restarted.view.status, "can_pause");
});

test("a plan that is ending, or another customer's plan, is never touched", async () => {
  const ending = fakeStripe(sub({ cancel_at_period_end: true }));
  assert.deepEqual(await pausePayments(ending.stripe, { customerId: "cus_1", subscriptionId: "sub_1", months: 1 }), { ok: false, reason: "cancelling" });
  assert.equal(ending.calls.length, 0);

  const other = fakeStripe(sub({ customer: "cus_someone_else" }));
  const result = await pausePayments(other.stripe, { customerId: "cus_1", subscriptionId: "sub_1", months: 1 });
  assert.equal(other.calls.length, 0, "never updates a subscription the customer does not own");
  assert.equal(result.ok, false);
});

test("the pause email states the real charge, links to the confirm page, and forces nothing", async () => {
  const { renderPauseOfferEmail, pauseUrl } = await import("../lib/email/pause-offer");
  const url = pauseUrl(createPauseToken("user-1", NOW));
  const email = renderPauseOfferEmail({ name: "Kiri Smith", amount: 2100, currency: "nzd", nextChargeAt: "2026-10-21T09:36:00.000Z", url });
  assert.match(email.text, /Kia ora Kiri/);
  assert.match(email.text, /NZ\$21 is due on Wednesday 21 October/);
  assert.match(email.text, /you do not need to do anything/);
  assert.ok(email.html.includes(url.replace(/&/g, "&amp;")) || email.html.includes(url), "button opens the confirm page");
  assert.ok(new URL(url).pathname === "/pause");
  assert.ok(!/[—–]/.test(email.text + email.subject), "no dashes in Leo's voice");
  for (const bad of ["undefined", "NaN", "null"]) assert.ok(!email.text.includes(bad), bad);
  const au = renderPauseOfferEmail({ name: "Kim", amount: 1900, currency: "aud", nextChargeAt: "2026-10-22T00:00:00.000Z", url });
  assert.match(au.text, /^Hi Kim/);
  assert.match(au.text, /A\$19/);
});
