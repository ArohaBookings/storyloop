import assert from "node:assert/strict";
import test from "node:test";
import {
  guardAdminAction,
  guardStoryLimitOverride,
  hasLiveStripeSubscription,
  isChargedWhileComped,
  isUnexplainedPaidAccess,
  sanitizeAdminSearch,
} from "../lib/admin-guards";

/**
 * The admin tool could change a paying customer's plan or disable their login
 * without touching Stripe, leaving the card charged for access they no longer
 * had. These pin the refusal.
 */

const paying = { plan: "educator", subscription_status: "active", stripe_subscription_id: "sub_123" };

test("an active, trialing or past-due subscription is live", () => {
  assert.equal(hasLiveStripeSubscription(paying), true);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "trialing" }), true);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "past_due" }), true);
});

test("a status overwritten by an earlier admin edit is still treated as live", () => {
  // The dangerous case: DB says comped, Stripe may still be billing.
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "admin_override" }), true);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "" }), true);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: null }), true);
});

test("only a provably ended subscription, or none at all, is not live", () => {
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "cancelled" }), false);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "canceled" }), false);
  assert.equal(hasLiveStripeSubscription({ ...paying, subscription_status: "incomplete_expired" }), false);
  assert.equal(hasLiveStripeSubscription({ ...paying, stripe_subscription_id: null }), false);
  assert.equal(hasLiveStripeSubscription({ ...paying, stripe_subscription_id: "   " }), false);
});

test("changing plan or disabling a live paying customer is refused, with the fix named", () => {
  const plan = guardAdminAction("set_plan", paying);
  assert.equal(plan.allowed, false);
  assert.ok(!plan.allowed && /Stripe/.test(plan.reason));

  const disable = guardAdminAction("disable", paying);
  assert.equal(disable.allowed, false);
  assert.ok(!disable.allowed && /Cancel the subscription in Stripe first/.test(disable.reason));
});

test("the same actions are allowed when nothing is being charged", () => {
  const free = { plan: "free", subscription_status: "free", stripe_subscription_id: null };
  assert.equal(guardAdminAction("set_plan", free).allowed, true);
  assert.equal(guardAdminAction("disable", free).allowed, true);
  const cancelled = { ...paying, subscription_status: "cancelled" };
  assert.equal(guardAdminAction("set_plan", cancelled).allowed, true);
});

test("harmless actions are never blocked, even on a paying customer", () => {
  for (const action of ["reset_password", "magic_link", "enable", "send_lifecycle_email", "set_internal"]) {
    assert.equal(guardAdminAction(action, paying).allowed, true, action);
  }
});

test("a missing profile refuses an access-changing action rather than guessing", () => {
  assert.equal(guardAdminAction("set_plan", null).allowed, false);
  assert.equal(guardAdminAction("reset_password", null).allowed, true);
});

test("billing integrity flags an account comped in the app but live in Stripe", () => {
  assert.equal(isChargedWhileComped({ ...paying, subscription_status: "admin_override" }), true);
  assert.equal(isChargedWhileComped(paying), false, "an honest active customer is fine");
  assert.equal(isChargedWhileComped({ plan: "educator", subscription_status: "admin_override", stripe_subscription_id: null }), false,
    "a comp with no Stripe subscription is not being charged");
});

test("admin search cannot inject PostgREST filter structure", () => {
  assert.equal(sanitizeAdminSearch("john.smith@centre.co.nz"), "john.smith@centre.co.nz");
  assert.equal(sanitizeAdminSearch("O'Brien"), "O'Brien");
  assert.equal(sanitizeAdminSearch("Ngāti Mā"), "Ngāti Mā", "macrons survive");
  const injected = sanitizeAdminSearch("x%,plan.eq.centre_growth),(is_internal.eq.true");
  assert.ok(!/[,()%]/.test(injected), `structure survived: ${injected}`);
  assert.equal(sanitizeAdminSearch('a"b*c'), "abc");
  assert.equal(sanitizeAdminSearch(42), "");
  assert.equal(sanitizeAdminSearch("x".repeat(300)).length, 80);
});

test("a story limit override is refused on a paid plan, where it would cap an unlimited customer", () => {
  // lib/story-limits.ts lets the override win over the plan, so 5 on a paying
  // Educator would mean five stories a month. This is the regression to stop.
  for (const plan of ["educator", "educator_pro", "centre_starter", "centre_growth", "centre"]) {
    const verdict = guardStoryLimitOverride({ plan }, 5);
    assert.equal(verdict.allowed, false, plan);
  }
});

test("a free account can be given extra stories", () => {
  assert.equal(guardStoryLimitOverride({ plan: "free" }, 10).allowed, true);
  assert.equal(guardStoryLimitOverride({ plan: null }, 10).allowed, true);
});

test("clearing an override is always allowed, because clearing only restores access", () => {
  assert.equal(guardStoryLimitOverride({ plan: "educator" }, null).allowed, true);
  assert.equal(guardStoryLimitOverride({ plan: "educator" }, 0).allowed, true);
});

test("nonsense override values are refused", () => {
  for (const value of [-1, 1.5, 1001, "10", Number.NaN]) {
    assert.equal(guardStoryLimitOverride({ plan: "free" }, value).allowed, false, String(value));
  }
  assert.equal(guardStoryLimitOverride(null, 5).allowed, false);
});

test("paid access with no subscription behind it is flagged: the self-upgrade exploit's fingerprint", () => {
  assert.equal(isUnexplainedPaidAccess({ plan: "centre_growth", subscription_status: "active", stripe_subscription_id: null }), true);
  assert.equal(isUnexplainedPaidAccess({ plan: "educator", subscription_status: "trialing", stripe_subscription_id: "" }), true);
  assert.equal(isUnexplainedPaidAccess({ plan: "free", subscription_status: "free", monthly_story_limit_override: 1000 }), true);
});

test("genuine customers, comps and access codes are never flagged", () => {
  assert.equal(isUnexplainedPaidAccess({ plan: "educator", subscription_status: "active", stripe_subscription_id: "sub_1" }), false);
  assert.equal(isUnexplainedPaidAccess({ plan: "educator", subscription_status: "admin_override", stripe_subscription_id: null }), false);
  assert.equal(isUnexplainedPaidAccess({ plan: "educator", subscription_status: "active", applied_access_code: "nikky" }), false);
  assert.equal(isUnexplainedPaidAccess({ plan: "free", subscription_status: "free", monthly_story_limit_override: 10, applied_access_code: "nikky" }), false);
  assert.equal(isUnexplainedPaidAccess({ plan: "free", subscription_status: "free" }), false);
  assert.equal(isUnexplainedPaidAccess({ plan: "educator", subscription_status: "past_due", stripe_subscription_id: null }), false);
});
