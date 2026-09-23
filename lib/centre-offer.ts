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
 * THE FIRST TEN CENTRES (founding centres): the same free month, then 50% off.
 * In return we ask for honest feedback and a review, good or bad, which is
 * published marked as a founding-centre review. The discount never depends on
 * what the review says.
 *
 * The count is Stripe's, not ours: the coupon has max_redemptions = 10, so
 * "spots left" is 10 minus times_redeemed, read from the coupon itself. It
 * cannot drift from what Stripe will actually honour, and when the last spot
 * goes Stripe refuses the coupon, which checkout treats as "no founding offer"
 * rather than as an error.
 *
 * Why the coupon lasts 4 months: a repeating coupon's clock starts when it is
 * applied, which is the start of the free month. Four months covers the trial
 * plus at least three paid months (occasionally a fourth, depending on month
 * lengths), which is what the offer promises.
 */

export const CENTRE_TRIAL_DAYS = 30;
export const INDIVIDUAL_TRIAL_DAYS = 7;
export const FOUNDING_CENTRE_SPOTS = 10;
export const FOUNDING_DISCOUNT_PERCENT = 50;
export const FOUNDING_DISCOUNT_MONTHS = 3;
export const DEFAULT_FOUNDING_COUPON_ID = "storyloop_founding_centre_50";

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
  const spotAvailable = input.spotsLeft === null || input.spotsLeft > 0;
  return {
    trialDays: CENTRE_TRIAL_DAYS,
    noCardNeeded: true,
    foundingCoupon: !input.hadCentreBefore && spotAvailable ? input.couponId : null,
  };
}

/** Spots left from the coupon's own counters. Pure. */
export function spotsFromCoupon(coupon: Pick<Stripe.Coupon, "max_redemptions" | "times_redeemed" | "valid"> | null): number | null {
  if (!coupon) return null;
  if (!coupon.valid) return 0;
  const max = coupon.max_redemptions ?? FOUNDING_CENTRE_SPOTS;
  return Math.max(0, max - (coupon.times_redeemed ?? 0));
}

let cached: { at: number; spots: number | null } | null = null;
const CACHE_MS = 5 * 60_000;

/**
 * Founding spots left, read from Stripe and cached for five minutes. Null when
 * Stripe cannot be reached or the coupon does not exist, in which case pages
 * show the offer without a number rather than inventing one.
 */
export async function foundingSpotsLeft(stripe: Stripe, options: { fresh?: boolean } = {}): Promise<number | null> {
  if (!options.fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.spots;
  let spots: number | null = null;
  try {
    const coupon = await stripe.coupons.retrieve(foundingCouponId());
    spots = spotsFromCoupon(coupon);
  } catch {
    spots = null;
  }
  cached = { at: Date.now(), spots };
  return spots;
}

/** For tests: forget the cached count. */
export function resetFoundingSpotsCache() {
  cached = null;
}

/** Whether Stripe refused a checkout because the coupon is spent or invalid. */
export function isCouponRefusal(error: unknown): boolean {
  const e = error as { code?: string; message?: string; param?: string } | null;
  if (!e) return false;
  if (e.code === "coupon_expired" || e.code === "resource_missing") return true;
  return /coupon/i.test(e.message ?? "") || /discounts/.test(e.param ?? "");
}
