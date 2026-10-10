import type Stripe from "stripe";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";

/**
 * What a centre gets when it starts StoryLoop.
 *
 * EVERY CENTRE: a 30-day free trial with no card needed. A director deciding
 * for a whole team needs a real month of use, not a week, and a card form in
 * front of a trial is the single biggest reason a busy director closes the tab
 * and "looks at it later". If no card is added by the end, the subscription
 * simply cancels (Stripe `missing_payment_method: cancel`), nobody is charged,
 * and the account drops back to the free plan with everything kept.
 *
 * THE FIRST TEN CENTRES (founding centres): the same free month, then their
 * first three PAID months at half price. In return we ask for honest feedback and
 * a review, good or bad, which is published marked as a founding-centre review.
 * The discount never depends on what the review says.
 *
 * Exactly three paid months. Stripe counts a repeating coupon in billing
 * cycles after the free month, so a 3-month coupon gives the three paid months
 * and Stripe's own checkout line reads "50% off next 3 billing cycles", the same
 * as StoryLoop's wording. Proven with a test clock in Stripe test mode on
 * 10 Oct 2026: free month $0, then NZ$54.50 for Nov, Dec and Jan, then NZ$109.
 * (The first founding coupon ran 4 months, which gave four half-price months
 * while the site said three.) As a backstop the discount also comes off the
 * moment a third paid month is paid (settleFoundingDiscount, from the
 * invoice.paid webhook and the six-hourly cron), which also caps any
 * subscription still carrying an earlier coupon.
 *
 * Spots are counted from the founding subscriptions themselves, not from the
 * coupon's redemption counter. A coupon counts as redeemed the moment a trial
 * starts, so ten centres that only tried the free month would have used up every
 * spot without paying anything. Now a centre on its free month HOLDS a spot, a
 * centre that has paid has USED one, and a free month that ends without a card
 * gives its spot back. The coupon has no max_redemptions; the count is enforced
 * here.
 */

export const CENTRE_TRIAL_DAYS = 30;
export const INDIVIDUAL_TRIAL_DAYS = 7;
export const FOUNDING_CENTRE_SPOTS = 10;
export const FOUNDING_DISCOUNT_PERCENT = 50;
export const FOUNDING_DISCOUNT_MONTHS = 3;
export const DEFAULT_FOUNDING_COUPON_ID = "storyloop_founding_centre_3paid";
/** Earlier founding coupons (both 4 months, neither ever redeemed), still recognised if one turns up. */
export const LEGACY_FOUNDING_COUPON_IDS = ["storyloop_founding_centre_50", "storyloop_founding_centre_3m"];

export function foundingCouponId(env: Record<string, string | undefined> = process.env) {
  return env.STRIPE_FOUNDING_CENTRE_COUPON_ID?.trim() || DEFAULT_FOUNDING_COUPON_ID;
}

export function isCentrePlan(plan: unknown): boolean {
  const key = normalizePlanKey(plan);
  return key === "centre_starter" || key === "centre_growth";
}

export type CheckoutTerms = {
  trialDays: number;
  /** Stripe may skip the card form; the trial cancels if none is added. */
  noCardNeeded: boolean;
  /** The founding coupon, when a spot is available and this is a new centre. */
  foundingCoupon: string | null;
};

/**
 * The terms for one checkout. Pure.
 *
 * `spotsLeft` is null when Stripe could not be asked; the founding coupon is
 * still attempted then, because Stripe will refuse it if the spots are gone
 * and checkout retries without it.
 */
export function checkoutTerms(input: {
  plan: PlanKey;
  spotsLeft: number | null;
  /** A centre that has had a centre subscription before is not a new centre. */
  hadCentreBefore: boolean;
  couponId: string;
}): CheckoutTerms {
  if (!isCentrePlan(input.plan)) {
    return { trialDays: INDIVIDUAL_TRIAL_DAYS, noCardNeeded: false, foundingCoupon: null };
  }
  // One free month per centre. Without this, a centre could let the trial
  // lapse and start a new no-card month, indefinitely. A returning centre
  // subscribes straight away with a card, like any other returning customer.
  if (input.hadCentreBefore) {
    return { trialDays: 0, noCardNeeded: false, foundingCoupon: null };
  }
  const spotAvailable = input.spotsLeft === null || input.spotsLeft > 0;
  return {
    trialDays: CENTRE_TRIAL_DAYS,
    noCardNeeded: true,
    foundingCoupon: spotAvailable ? input.couponId : null,
  };
}

type FoundingSubscriptionLike = {
  id?: string;
  customer?: string | { id?: string } | null;
  status: string;
  metadata?: Record<string, string> | null;
};

const LIVE_STATUSES = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

/**
 * Does this subscription take one of the ten founding spots? Pure.
 *
 * A centre that has paid has used its spot for good, whatever happens next. A
 * centre on its free month (or a live subscription) holds one. A free month that
 * ended without a card, or a checkout never completed, holds nothing.
 */
export function holdsFoundingSpot(sub: FoundingSubscriptionLike): boolean {
  if (sub.metadata?.founding_centre !== "true") return false;
  if (sub.metadata?.founding_paid === "true") return true;
  return LIVE_STATUSES.has(sub.status);
}

/** Spots left, counting each centre (Stripe customer) once. Pure. */
export function spotsLeftFromSubscriptions(subs: FoundingSubscriptionLike[], total = FOUNDING_CENTRE_SPOTS): number {
  const holders = new Set(
    subs
      .filter(holdsFoundingSpot)
      .map((sub, index) => (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? sub.id ?? `unnamed-${index}`),
  );
  return Math.max(0, total - holders.size);
}

let cached: { at: number; spots: number | null } | null = null;
/** Five minutes unless FOUNDING_SPOTS_CACHE_SECONDS says otherwise (the local tests use 0). */
const cacheMs = () => {
  const seconds = Number(process.env.FOUNDING_SPOTS_CACHE_SECONDS);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 5 * 60_000;
};
const FOUNDING_QUERY = "metadata['founding_centre']:'true'";

/** Every subscription ever started as a founding centre (Stripe search). */
export async function listFoundingSubscriptions(stripe: Stripe): Promise<Stripe.Subscription[]> {
  const subs: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.search({ query: FOUNDING_QUERY, limit: 100 })) {
    subs.push(sub);
    if (subs.length >= 500) break;
  }
  return subs;
}

/**
 * Founding spots left, from Stripe and cached for five minutes. Null when Stripe
 * cannot be asked, in which case pages show the offer without a number rather
 * than inventing one.
 */
export async function foundingSpotsLeft(stripe: Stripe, options: { fresh?: boolean } = {}): Promise<number | null> {
  if (!options.fresh && cached && Date.now() - cached.at < cacheMs()) return cached.spots;
  let spots: number | null = null;
  try {
    spots = spotsLeftFromSubscriptions(await listFoundingSubscriptions(stripe));
  } catch (error) {
    console.error("Founding spots unavailable:", error);
    spots = null;
  }
  cached = { at: Date.now(), spots };
  return spots;
}

/** For tests: forget the cached count. */
export function resetFoundingSpotsCache() {
  cached = null;
}

/**
 * Paid months so far: monthly invoices that charged something. Pure.
 *
 * The free month's $0 invoice is not a paid month. A month covered by StoryLoop
 * credit still is (its total is above zero; the credit only lowers what was
 * taken from the card). A mid-month plan-change invoice is not a month.
 */
export function foundingPaidMonths(invoices: Array<{ status?: string | null; amount_paid?: number | null; total?: number | null; billing_reason?: string | null }>): number {
  return invoices.filter((invoice) => {
    if (invoice.status !== "paid") return false;
    if (invoice.billing_reason === "subscription_update" || invoice.billing_reason === "manual") return false;
    return (invoice.total ?? invoice.amount_paid ?? 0) > 0;
  }).length;
}

function couponIdOf(discount: string | Stripe.Discount): string | null {
  if (typeof discount === "string") return null;
  const source = (discount as { source?: { coupon?: string | { id?: string } | null } }).source;
  const legacy = (discount as { coupon?: string | { id?: string } | null }).coupon;
  const coupon = source?.coupon ?? legacy;
  return typeof coupon === "string" ? coupon : coupon?.id ?? null;
}

/** Whether a discount on a subscription is a founding-centre discount. Pure. */
export function isFoundingDiscount(discount: string | Stripe.Discount, env: Record<string, string | undefined> = process.env): boolean {
  const id = couponIdOf(discount);
  return Boolean(id) && (id === foundingCouponId(env) || LEGACY_FOUNDING_COUPON_IDS.includes(id as string));
}

/**
 * Keep a founding centre's discount to exactly three paid months, and mark the
 * spot as used once they have paid. Safe to run any number of times.
 */
export async function settleFoundingDiscount(stripe: Stripe, subscriptionId: string) {
  const result = { founding: false, paidMonths: 0, markedPaid: false, discountRemoved: false };
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["discounts"] });
  if (sub.metadata?.founding_centre !== "true") return result;
  result.founding = true;
  const invoices = await stripe.invoices.list({ subscription: subscriptionId, status: "paid", limit: 24 });
  result.paidMonths = foundingPaidMonths(invoices.data);
  if (result.paidMonths > 0 && sub.metadata?.founding_paid !== "true") {
    await stripe.subscriptions.update(subscriptionId, { metadata: { founding_paid: "true" } });
    result.markedPaid = true;
  }
  const discounts = (sub.discounts ?? []) as Array<string | Stripe.Discount>;
  const founding = discounts.filter((discount) => isFoundingDiscount(discount));
  if (result.paidMonths >= FOUNDING_DISCOUNT_MONTHS && founding.length) {
    const keep = discounts.filter((discount) => !isFoundingDiscount(discount)).map((discount) => ({ discount: typeof discount === "string" ? discount : discount.id }));
    await stripe.subscriptions.update(subscriptionId, { discounts: keep.length ? keep : "" });
    result.discountRemoved = true;
  }
  return result;
}

/** The six-hourly backstop: settle every founding centre that is paying. */
export async function settleAllFoundingDiscounts(stripe: Stripe) {
  const summary = { checked: 0, discountsRemoved: 0, markedPaid: 0, errors: 0 };
  for (const sub of await listFoundingSubscriptions(stripe)) {
    if (!["active", "past_due", "unpaid"].includes(sub.status)) continue;
    summary.checked += 1;
    try {
      const outcome = await settleFoundingDiscount(stripe, sub.id);
      if (outcome.discountRemoved) summary.discountsRemoved += 1;
      if (outcome.markedPaid) summary.markedPaid += 1;
    } catch (error) {
      summary.errors += 1;
      console.error("Founding discount settle failed:", sub.id, error);
    }
  }
  return summary;
}

/** Whether Stripe refused a checkout because the coupon is spent or invalid. */
export function isCouponRefusal(error: unknown): boolean {
  const e = error as { code?: string; message?: string; param?: string } | null;
  if (!e) return false;
  if (e.code === "coupon_expired" || e.code === "resource_missing") return true;
  return /coupon/i.test(e.message ?? "") || /discounts/.test(e.param ?? "");
}

type EndedSubscription = {
  trial_end?: number | null;
  ended_at?: number | null;
  canceled_at?: number | null;
  default_payment_method?: unknown;
  trial_settings?: { end_behavior?: { missing_payment_method?: string } } | null;
};

/**
 * Did this subscription end because a no-card free month ran out? Pure.
 *
 * That is not a cancellation, and it must not be written to like one: "your
 * subscription has ended and you will not be charged again" tells a director
 * who never paid anything that they were charged before.
 */
export function trialLapsedWithoutCard(sub: EndedSubscription): boolean {
  if (sub.trial_settings?.end_behavior?.missing_payment_method !== "cancel") return false;
  if (sub.default_payment_method) return false;
  const endedAt = sub.ended_at ?? sub.canceled_at;
  if (!sub.trial_end || !endedAt) return false;
  // Stripe ends it at the trial end; allow a few hours of processing.
  return Math.abs(endedAt - sub.trial_end) <= 6 * 3600;
}
