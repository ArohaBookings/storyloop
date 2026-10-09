/**
 * The discount part of a Stripe Checkout session: a coupon, or the promotion
 * code box, never both.
 *
 * Stripe refuses a session that sets both `discounts` and
 * `allow_promotion_codes`, even when `allow_promotion_codes` is false ("You
 * may only specify one of these parameters"). Checkout used to send both, so
 * every checkout carrying a coupon failed: the in-app 15% activation offer,
 * the referral discount and the founding centre offer. An Australian educator
 * hit it upgrading from /billing?offer=activation on 8 Oct 2026.
 */
export function checkoutDiscountParams(
  coupon: string | null | undefined,
  offer: string | null,
): { discounts: { coupon: string }[] } | { allow_promotion_codes: boolean } {
  if (coupon) return { discounts: [{ coupon }] };
  // A free month is the whole offer; a promotion code on top of it is not.
  return { allow_promotion_codes: !offer };
}
