import assert from "node:assert/strict";
import test from "node:test";
import { abandonedCheckoutCandidates, stillAbandoned } from "../lib/abandoned-checkout";
import { renderLifecycleEmail } from "../lib/email/templates";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const since = 1_789_000_000;

test("finds each user's latest unfinished StoryLoop checkout, and nothing else", () => {
  const candidates = abandonedCheckoutCandidates(
    [
      { id: "cs_old", status: "expired", created: since + 10, metadata: { user_id: A, plan: "educator" } },
      { id: "cs_new", status: "expired", created: since + 20, metadata: { user_id: A, plan: "educator_pro", trial_days: "30", offer_id: "pro_free_month_2026_10" } },
      { id: "cs_done", status: "complete", created: since + 30, metadata: { user_id: B, plan: "educator" } },
      { id: "cs_open", status: "open", created: since + 30, metadata: { user_id: B, plan: "educator" } },
      { id: "cs_before", status: "expired", created: since - 10, metadata: { user_id: B, plan: "educator" } },
      // Another product on the shared Stripe account.
      { id: "cs_aroha", status: "expired", created: since + 40, metadata: { userId: "cmsvn1", planId: "starter" } },
      { id: "cs_bad_plan", status: "expired", created: since + 40, metadata: { user_id: B, plan: "starter" } },
      { id: "cs_bad_user", status: "expired", created: since + 40, metadata: { user_id: "not-a-uuid", plan: "educator" } },
    ],
    since,
  );
  assert.deepEqual(candidates, [
    { userId: A, plan: "educator_pro", sessionId: "cs_new", created: since + 20, trialDays: 30, noCard: false, offer: "pro_free_month_2026_10" },
  ]);
});

test("only people still on the free plan, reachable and not internal, get the email", () => {
  const base = { email: "kaiako@example.com", plan: "free", subscription_status: null, is_internal: false, marketing_unsubscribed_at: null };
  assert.equal(stillAbandoned(base), true);
  assert.equal(stillAbandoned({ ...base, plan: "educator", subscription_status: "trialing" }), false, "they came back and started");
  assert.equal(stillAbandoned({ ...base, subscription_status: "trialing" }), false);
  assert.equal(stillAbandoned({ ...base, is_internal: true }), false);
  assert.equal(stillAbandoned({ ...base, email: null }), false);
  assert.equal(stillAbandoned({ ...base, marketing_unsubscribed_at: "2026-09-01T00:00:00Z" }), false);
  // Cancelled accounts are back on free and may genuinely want to restart.
  assert.equal(stillAbandoned({ ...base, subscription_status: "cancelled" }), true);
});

test("the email states the real trial terms, offers no discount, and can be unsubscribed from", () => {
  const email = renderLifecycleEmail({
    type: "checkout_abandoned",
    userId: "u",
    recipient: "kaiako@example.com",
    name: "Aroha Smith",
    context: { planLabel: "Educator Pro" },
  });
  assert.equal(email.marketing, true);
  assert.match(email.html, /unsubscribe/);
  assert.match(email.text, /you picked Educator Pro/);
  // Checkout always sets trial_period_days: 7.
  assert.match(email.text, /7-day free trial\. Nothing is charged until it ends/);
  assert.doesNotMatch(email.subject + email.text, /% off|discount/i);
  assert.match(email.ctaUrl, /\/billing\?/);
  for (const bad of ["undefined", "NaN", "null", "${"]) assert.ok(!email.html.includes(bad) && !email.text.includes(bad), `leaked ${bad}`);
});

test("the email restates the terms that checkout actually offered", () => {
  const render = (context: Record<string, unknown>) =>
    renderLifecycleEmail({ type: "checkout_abandoned", userId: "u", recipient: "kaiako@example.com", name: "Aroha", context: { planLabel: "Educator Pro", ...context } });
  const offer = render({ offerCode: "pro_free_month_2026_10", trialDays: 30 });
  assert.match(offer.subject, /free month of StoryLoop Pro/);
  assert.match(offer.text, /nothing is charged for 30 days/);
  assert.match(offer.ctaUrl, /\/offer\/pro-month\?/);
  const centre = render({ planLabel: "Centre Starter", centreTrial: true, trialDays: 30 });
  assert.match(centre.text, /30 days free with no card needed/);
  assert.doesNotMatch(centre.text, /7-day/);
  const returning = render({ planLabel: "Centre Growth", trialDays: 0 });
  assert.match(returning.text, /cancel from Billing at any time/);
  for (const email of [offer, centre, returning]) {
    for (const bad of ["undefined", "NaN", "null", "${"]) assert.ok(!email.html.includes(bad) && !email.text.includes(bad), `leaked ${bad}`);
  }
});
