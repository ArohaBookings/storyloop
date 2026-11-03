/**
 * The early-educator offer: half price for a free educator's first two paid
 * months, applied at checkout for ?offer=activation (the "one story left" and
 * "out of free stories" emails, and the upgrade links in the app).
 *
 * 3 Nov 2026, Leo: "You can raise the offer for 50% off for 2 months." It was
 * 15% off the first month (coupon 9AN8qNFe, which production's stored
 * stripe_first_month_coupon_id still names). A discount simulation
 * (storyloop-ops/sim/discount_sim.py) put 50% off two months at about 55% more
 * subscribers.
 *
 * The label every email and page shows and the coupon checkout applies both
 * come from these constants, and checkout refuses any coupon that does not
 * match them, so what an email promises is exactly what is charged. The stored
 * setting is no longer read: it named the old 15% coupon, and a setting that
 * can drift from the wording is how an email ends up promising one discount
 * while checkout applies another.
 */
export const ACTIVATION_COUPON_ID = "storyloop_activation_50_2m";
export const ACTIVATION_PERCENT_OFF = 50;
export const ACTIVATION_MONTHS = 2;
export const ACTIVATION_OFFER_LABEL = `${ACTIVATION_PERCENT_OFF}% off your first ${ACTIVATION_MONTHS} months`;

type CouponLike = { id?: string; percent_off?: number | null; duration?: string | null; duration_in_months?: number | null; valid?: boolean | null; deleted?: boolean };
type CouponApi = {
  retrieve: (id: string) => Promise<CouponLike & { id: string }>;
  create: (params: Record<string, unknown>) => Promise<CouponLike & { id: string }>;
};

/** True only for a coupon that is exactly the early-educator terms. */
export function isActivationCoupon(coupon: CouponLike | null | undefined) {
  return Boolean(
    coupon &&
      !coupon.deleted &&
      coupon.valid !== false &&
      coupon.percent_off === ACTIVATION_PERCENT_OFF &&
      coupon.duration === "repeating" &&
      coupon.duration_in_months === ACTIVATION_MONTHS,
  );
}

/**
 * The early-educator coupon, made on first use if it is missing. Throws rather
 * than ever applying a coupon with different terms from the email, so checkout
 * can stop and say so instead of charging full price to someone promised half.
 */
export async function ensureActivationCoupon(coupons: CouponApi): Promise<string> {
  let coupon: (CouponLike & { id: string }) | null = null;
  try {
    coupon = await coupons.retrieve(ACTIVATION_COUPON_ID);
  } catch {
    coupon = await coupons.create({
      id: ACTIVATION_COUPON_ID,
      percent_off: ACTIVATION_PERCENT_OFF,
      duration: "repeating",
      duration_in_months: ACTIVATION_MONTHS,
      name: `Early educator: ${ACTIVATION_PERCENT_OFF}% off ${ACTIVATION_MONTHS} months`, // Stripe allows 40 characters
      metadata: { app: "storyloop", purpose: "activation" },
    });
  }
  if (!isActivationCoupon(coupon)) throw new Error(`Coupon ${ACTIVATION_COUPON_ID} does not match the early-educator terms`);
  return coupon!.id;
}
