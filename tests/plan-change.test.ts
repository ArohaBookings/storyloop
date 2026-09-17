import assert from "node:assert/strict";
import test from "node:test";
import { canOfferInAppSwitch, checkPlanChange, planChangeSummary, planProductId, type ProfileFacts, type SubscriptionFacts } from "../lib/plan-change";

const profile: ProfileFacts = { userId: "user-1", plan: "educator", stripeSubscriptionId: "sub_1", stripeCustomerId: "cus_1" };
const subscription: SubscriptionFacts = {
  id: "sub_1", status: "active", customerId: "cus_1", metadataUserId: "user-1",
  cancelAtPeriodEnd: false, cancelAt: null, itemCount: 1, currency: "aud",
};

test("an Educator can upgrade to Educator Pro or a centre plan, in the subscription's currency", () => {
  const pro = checkPlanChange({ profile, subscription, targetPlan: "educator_pro" });
  assert.deepEqual(pro, { ok: true, from: "educator", to: "educator_pro", direction: "upgrade", currency: "AUD", trialing: false });
  const centre = checkPlanChange({ profile, subscription: { ...subscription, currency: "nzd" }, targetPlan: "centre_starter" });
  assert.equal(centre.ok && centre.currency, "NZD");
});

test("Educator Pro can step down to Educator instead of cancelling", () => {
  const check = checkPlanChange({ profile: { ...profile, plan: "educator_pro" }, subscription, targetPlan: "educator" });
  assert.equal(check.ok && check.direction, "downgrade");
  if (!check.ok) return;
  const summary = planChangeSummary(check);
  assert.equal(summary.title, "Switch to Educator?");
  assert.match(summary.detail, /credited to your next invoice, then it is A\$19 a month/);
  assert.match(summary.detail, /Every story you have written stays yours/);
});

test("the preview says exactly what happens to money", () => {
  const upgrade = checkPlanChange({ profile, subscription, targetPlan: "educator_pro" });
  assert.ok(upgrade.ok);
  assert.match(planChangeSummary(upgrade).detail, /added to your next invoice, then it is A\$29 a month\. Nothing is charged right now\./);

  const trial = checkPlanChange({ profile, subscription: { ...subscription, status: "trialing", currency: "nzd" }, targetPlan: "educator_pro" });
  assert.ok(trial.ok);
  assert.match(planChangeSummary(trial).detail, /free trial, so nothing is charged now.*first payment will be NZ\$33 a month/);
});

test("switching is refused whenever it could charge the wrong person or the wrong thing", () => {
  const refused = (overrides: { profile?: Partial<ProfileFacts>; subscription?: Partial<SubscriptionFacts> | null; target?: unknown }) => {
    const result = checkPlanChange({
      profile: { ...profile, ...overrides.profile },
      subscription: overrides.subscription === null ? null : { ...subscription, ...overrides.subscription },
      targetPlan: overrides.target ?? "educator_pro",
    });
    assert.equal(result.ok, false);
    return result.ok ? "" : result.reason;
  };
  assert.equal(refused({ target: "free" }), "invalid_plan");
  assert.equal(refused({ target: "enterprise" }), "invalid_plan");
  assert.equal(refused({ target: "__proto__" }), "invalid_plan");
  assert.equal(refused({ profile: { plan: "free" } }), "not_subscribed");
  assert.equal(refused({ target: "educator" }), "same_plan");
  assert.equal(refused({ profile: { stripeSubscriptionId: null } }), "no_subscription");
  assert.equal(refused({ subscription: null }), "no_subscription");
  assert.equal(refused({ subscription: { id: "sub_other" } }), "subscription_mismatch");
  assert.equal(refused({ subscription: { metadataUserId: "someone-else", customerId: "cus_other" } }), "not_owner");
  assert.equal(refused({ subscription: { status: "past_due" } }), "not_active");
  assert.equal(refused({ subscription: { status: "canceled" } }), "not_active");
  assert.equal(refused({ subscription: { cancelAtPeriodEnd: true } }), "cancellation_scheduled");
  assert.equal(refused({ subscription: { cancelAt: 1791244800 } }), "cancellation_scheduled");
  assert.equal(refused({ subscription: { itemCount: 2 } }), "unexpected_items");
  assert.equal(refused({ subscription: { currency: "usd" } }), "unsupported_currency");
});

test("ownership can be proven by the Stripe customer when older subscriptions lack metadata", () => {
  const check = checkPlanChange({ profile, subscription: { ...subscription, metadataUserId: null }, targetPlan: "educator_pro" });
  assert.equal(check.ok, true);
  const noCustomer = checkPlanChange({ profile: { ...profile, stripeCustomerId: null }, subscription: { ...subscription, metadataUserId: null }, targetPlan: "educator_pro" });
  assert.equal(noCustomer.ok, false);
});

test("the page only offers an in-app switch to healthy Stripe subscriptions", () => {
  assert.equal(canOfferInAppSwitch({ plan: "educator", subscription_status: "active", stripe_subscription_id: "sub_1" }), true);
  assert.equal(canOfferInAppSwitch({ plan: "educator_pro", subscription_status: "trialing", stripe_subscription_id: "sub_1" }), true);
  // Comped accounts, past due payments and free accounts keep their current paths.
  assert.equal(canOfferInAppSwitch({ plan: "educator_pro", subscription_status: "admin_override", stripe_subscription_id: null }), false);
  assert.equal(canOfferInAppSwitch({ plan: "educator", subscription_status: "past_due", stripe_subscription_id: "sub_1" }), false);
  assert.equal(canOfferInAppSwitch({ plan: "free", subscription_status: null, stripe_subscription_id: null }), false);
});

test("plan products have stable ids", () => {
  assert.equal(planProductId("educator_pro"), "storyloop_plan_educator_pro");
});
