import type Stripe from "stripe";

/**
 * The first-month activation discount that emails promise ("15% off your first
 * month", ACTIVATION_OFFER_LABEL) and checkout applies for ?offer=activation.
 *
 * Checkout used to apply it only when STRIPE_FIRST_MONTH_COUPON_ID was set.
 * Stripe showed that no StoryLoop checkout has ever carried the discount, so if
 * that setting is missing, every email offering it has been an empty promise.
 * The configured id still wins; otherwise the live StoryLoop activation coupon
 * is used, and only if that has gone does a matching one get created.
 */
export const EXISTING_ACTIVATION_COUPON_ID = "9AN8qNFe"; // "StoryLoop activation offer - first month", 15% once
export const CREATED_ACTIVATION_COUPON_ID = "storyloop_activation_15";
export const ACTIVATION_PERCENT_OFF = 15;

type CouponApi = Pick<Stripe["coupons"], "retrieve" | "create">;

export async function resolveActivationCoupon(
  coupons: CouponApi,
  configuredId: string | null | undefined,
): Promise<string | undefined> {
  if (configuredId) return configuredId;

  for (const id of [EXISTING_ACTIVATION_COUPON_ID, CREATED_ACTIVATION_COUPON_ID]) {
    try {
      const coupon = await coupons.retrieve(id);
      if (coupon.valid && coupon.percent_off === ACTIVATION_PERCENT_OFF && coupon.duration === "once") return coupon.id;
    } catch {
      // Not found or not usable: try the next one.
    }
  }

  try {
    const created = await coupons.create({
      id: CREATED_ACTIVATION_COUPON_ID,
      percent_off: ACTIVATION_PERCENT_OFF,
      duration: "once",
      name: "StoryLoop activation offer - 15% off first month",
      metadata: { app: "storyloop", purpose: "activation" },
    });
    return created.id;
  } catch (error) {
    // A missing discount must never block someone from subscribing.
    console.error("Activation coupon unavailable:", error);
    return undefined;
  }
}
