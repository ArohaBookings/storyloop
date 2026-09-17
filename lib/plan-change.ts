import { getPlanByKey, planRank, PLAN_ORDER, type CurrencyCode, type PlanKey } from "@/lib/plans";

/**
 * Switching between paid plans inside StoryLoop.
 *
 * Every upgrade button for a paying customer used to open the Stripe billing
 * portal, where plan changes are switched off, and they cannot simply be
 * switched on: subscriptions are built on one-off prices the portal cannot
 * offer. So an Educator who wanted Educator Pro or a centre plan had no way to
 * pay for it. This is the rule book for doing it here instead.
 *
 * Money rules, stated to the customer before they confirm:
 * - The change applies straight away, with Stripe prorations: the difference
 *   for the rest of the period is added to (upgrade) or credited against
 *   (downgrade) the next invoice. Nothing is charged at the moment of switching.
 * - During the free trial nothing is charged either way; the first payment is
 *   the new plan's price.
 * - The subscription's own currency is used, never the page's currency toggle.
 */

export type SubscriptionFacts = {
  id: string;
  status: string;
  customerId: string | null;
  metadataUserId: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  itemCount: number;
  currency: string;
};

export type ProfileFacts = {
  userId: string;
  plan: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
};

export type PlanChangeCheck =
  | { ok: true; from: PlanKey; to: PlanKey; direction: "upgrade" | "downgrade"; currency: CurrencyCode; trialing: boolean }
  | { ok: false; reason: string; message: string };

const PAID_PLANS = PLAN_ORDER.filter((plan) => plan !== "free");

function isPaidPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PAID_PLANS as string[]).includes(value);
}

export function subscriptionCurrency(currency: string): CurrencyCode | null {
  const code = currency.toUpperCase();
  return code === "NZD" || code === "AUD" ? code : null;
}

/** Whether the page should offer an in-app switch at all, before asking Stripe. */
export function canOfferInAppSwitch(profile: { plan?: string | null; subscription_status?: string | null; stripe_subscription_id?: string | null }) {
  return (
    isPaidPlanKey(profile.plan) &&
    Boolean(profile.stripe_subscription_id) &&
    (profile.subscription_status === "active" || profile.subscription_status === "trialing")
  );
}

export function checkPlanChange(input: {
  profile: ProfileFacts;
  subscription: SubscriptionFacts | null;
  targetPlan: unknown;
}): PlanChangeCheck {
  const { profile, subscription, targetPlan } = input;
  const refuse = (reason: string, message: string): PlanChangeCheck => ({ ok: false, reason, message });

  if (!isPaidPlanKey(targetPlan)) return refuse("invalid_plan", "Choose one of the paid plans.");
  if (!isPaidPlanKey(profile.plan)) {
    return refuse("not_subscribed", "Start a plan from this page first. Switching is for existing subscriptions.");
  }
  if (targetPlan === profile.plan) return refuse("same_plan", `You are already on ${getPlanByKey(targetPlan).name}.`);
  if (!profile.stripeSubscriptionId || !subscription) {
    return refuse("no_subscription", "This account has no Stripe subscription to change. Contact support and we will sort it out.");
  }

  // The subscription must be this account's, checked two ways.
  if (subscription.id !== profile.stripeSubscriptionId) return refuse("subscription_mismatch", "Billing details do not match this account. Contact support.");
  const ownedByUser = subscription.metadataUserId === profile.userId;
  const ownedByCustomer = Boolean(profile.stripeCustomerId) && subscription.customerId === profile.stripeCustomerId;
  if (!ownedByUser && !ownedByCustomer) return refuse("not_owner", "Billing details do not match this account. Contact support.");

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return refuse("not_active", "Fix your payment first from Manage subscription, then switch plans.");
  }
  if (subscription.cancelAtPeriodEnd || subscription.cancelAt !== null) {
    return refuse("cancellation_scheduled", "Your plan is set to end. Keep it from Manage subscription first, then switch.");
  }
  if (subscription.itemCount !== 1) return refuse("unexpected_items", "This subscription has a custom setup. Contact support to change it.");

  const currency = subscriptionCurrency(subscription.currency);
  if (!currency) return refuse("unsupported_currency", "This subscription's currency is not supported for switching. Contact support.");

  return {
    ok: true,
    from: profile.plan,
    to: targetPlan,
    direction: planRank(targetPlan) > planRank(profile.plan) ? "upgrade" : "downgrade",
    currency,
    trialing: subscription.status === "trialing",
  };
}

const money = (currency: CurrencyCode, amount: number) => `${currency === "NZD" ? "NZ$" : "A$"}${amount}`;

/** What the customer is told before they confirm. Every sentence matches what the API does. */
export function planChangeSummary(check: Extract<PlanChangeCheck, { ok: true }>) {
  const from = getPlanByKey(check.from);
  const to = getPlanByKey(check.to);
  const newPrice = `${money(check.currency, to.price[check.currency])} a month`;

  if (check.trialing) {
    return {
      title: `Switch to ${to.name}?`,
      detail: `You are still in your free trial, so nothing is charged now. ${to.name} starts straight away, and your first payment will be ${newPrice}.`,
      newPrice,
    };
  }
  if (check.direction === "upgrade") {
    return {
      title: `Upgrade to ${to.name}?`,
      detail: `${to.name} starts straight away. The difference for the rest of this billing period is added to your next invoice, then it is ${newPrice}. Nothing is charged right now.`,
      newPrice,
    };
  }
  return {
    title: `Switch to ${to.name}?`,
    detail: `${to.name} starts straight away and ${from.name} features stop now. Your unused ${from.name} time is credited to your next invoice, then it is ${newPrice}. Every story you have written stays yours.`,
    newPrice,
  };
}

/** Stable Stripe product per plan, used when no fixed price is configured. */
export function planProductId(plan: PlanKey) {
  return `storyloop_plan_${plan}`;
}
