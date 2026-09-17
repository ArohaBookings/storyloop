/**
 * Guards for admin actions that could hurt a paying customer.
 *
 * The admin tool could change a user's plan or disable their login with one
 * click, and neither action touched Stripe. On a paying customer that means
 * Stripe keeps charging the card while the app removes or changes what they
 * paid for, and the dashboard quietly drops them from MRR because the status
 * was rewritten to admin_override. That is the one failure the whole business
 * cannot afford: charging someone for access they no longer have.
 *
 * So anything that changes access for an account with a live Stripe
 * subscription is refused, with the fix spelled out: change it in Stripe, and
 * the webhook brings the app into line.
 *
 * "Live" is deliberately conservative. The subscription_status column is only
 * our mirror of Stripe, and an earlier admin edit may already have overwritten
 * it. If a subscription id is present, it is treated as charging unless the
 * status proves it has ended. Refusing an admin click costs nothing; a wrong
 * charge costs a customer.
 */

export type GuardProfile = {
  plan?: string | null;
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
  is_internal?: boolean | null;
};

/** The only statuses that prove Stripe has stopped charging. */
const ENDED_STATUSES = new Set(["cancelled", "canceled", "incomplete_expired"]);

export function hasLiveStripeSubscription(profile: GuardProfile): boolean {
  const id = profile.stripe_subscription_id?.trim();
  if (!id) return false;
  return !ENDED_STATUSES.has((profile.subscription_status ?? "").trim().toLowerCase());
}

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

/** Actions that change what a customer can access or what they are charged for. */
const ACCESS_CHANGING_ACTIONS = new Set(["set_plan", "disable"]);

export function guardAdminAction(action: string, profile: GuardProfile | null): GuardResult {
  if (!ACCESS_CHANGING_ACTIONS.has(action)) return { allowed: true };
  if (!profile) return { allowed: false, reason: "User not found." };
  if (!hasLiveStripeSubscription(profile)) return { allowed: true };

  if (action === "disable") {
    return {
      allowed: false,
      reason:
        "This customer has a live Stripe subscription. Disabling their login would keep charging a card they can no longer use. Cancel the subscription in Stripe first, then disable.",
    };
  }
  return {
    allowed: false,
    reason:
      "This customer has a live Stripe subscription, so changing their plan here would leave Stripe charging for a different plan than they have. Change the plan in Stripe and the webhook will update the app.",
  };
}

/**
 * The monthly story limit override WINS over the plan in lib/story-limits.ts.
 * That makes it a useful support tool for a free user who needs a few more
 * stories, and a dangerous one on a paid plan: an override of 5 on an unlimited
 * Educator caps a paying customer at five stories. So a positive override is
 * only ever allowed on a free plan. Clearing it (null, or 0, which the limit
 * logic already ignores) is always allowed, because clearing can only restore
 * access, never remove it.
 */
export function guardStoryLimitOverride(profile: GuardProfile | null, value: unknown): GuardResult {
  if (!profile) return { allowed: false, reason: "User not found." };
  if (value === null || value === 0) return { allowed: true };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000) {
    return { allowed: false, reason: "Use a whole number from 1 to 1000, or clear the override." };
  }
  const plan = (profile.plan ?? "free").trim().toLowerCase();
  if (plan !== "free" && plan !== "") {
    return {
      allowed: false,
      reason:
        "This account is on a paid plan with unlimited stories. An override would cap them at that number, so it is only available for free accounts.",
    };
  }
  return { allowed: true };
}

/**
 * Accounts where the app and Stripe disagree in the direction that costs a
 * customer money: comped or cancelled in the app, still subscribed in Stripe.
 * This is the billing integrity check an operator should see at a glance.
 */
export function isChargedWhileComped(profile: GuardProfile): boolean {
  const status = (profile.subscription_status ?? "").trim().toLowerCase();
  return hasLiveStripeSubscription(profile) && (status === "admin_override" || status === "free" || status === "");
}

/**
 * Paid access with nothing paying for it: a paid plan marked active or trialing,
 * no Stripe subscription, and not a deliberate comp (admin_override) or an
 * access code.
 *
 * Until the protect_profile_billing_fields migration is applied, any signed-in
 * user could set exactly this on their own row through the public API. This is
 * the check that shows whether anyone did, and it stays useful afterwards as a
 * guard against a webhook that failed to record a real subscription.
 */
export function isUnexplainedPaidAccess(profile: GuardProfile & {
  applied_access_code?: string | null;
  monthly_story_limit_override?: number | null;
}): boolean {
  const plan = (profile.plan ?? "free").trim().toLowerCase();
  const status = (profile.subscription_status ?? "").trim().toLowerCase();
  const hasSubscription = Boolean(profile.stripe_subscription_id?.trim());
  const viaAccessCode = Boolean(profile.applied_access_code?.trim());

  const paidWithoutPayment = plan !== "free" && (status === "active" || status === "trialing") && !hasSubscription;
  const overrideWithoutReason =
    typeof profile.monthly_story_limit_override === "number" && profile.monthly_story_limit_override > 0 && !viaAccessCode;

  return (paidWithoutPayment && !viaAccessCode) || overrideWithoutReason;
}

/**
 * Make an admin search string safe to embed in a PostgREST `or` filter.
 *
 * The filter syntax treats commas and parentheses as structure, and double
 * quotes as value quoting, so a raw search term can close the ilike clause and
 * append its own conditions. An allowlist of characters that belong in a name
 * or an email address removes all of those, and the % and * wildcards too.
 * Dots stay: they are part of email addresses and are safe inside a value.
 */
export function sanitizeAdminSearch(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[^\p{L}\p{N}@._+\- ']/gu, "").trim().slice(0, 80);
}
