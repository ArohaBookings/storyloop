import assert from "node:assert/strict";
import test from "node:test";
import { checkoutDiscountParams } from "../lib/checkout-discount";

// Stripe refuses a Checkout session with both `discounts` and
// `allow_promotion_codes`, even when the latter is false. Sending both broke
// every discounted checkout in production until 9 Oct 2026.

test("a coupon is sent alone, without the promotion code flag", () => {
  for (const offer of [null, "pro_month"]) {
    const params = checkoutDiscountParams("9AN8qNFe", offer);
    assert.deepEqual(params, { discounts: [{ coupon: "9AN8qNFe" }] });
    assert.equal("allow_promotion_codes" in params, false);
  }
});

test("without a coupon, promotion codes are allowed unless it is an offer checkout", () => {
  assert.deepEqual(checkoutDiscountParams(undefined, null), { allow_promotion_codes: true });
  assert.deepEqual(checkoutDiscountParams(null, null), { allow_promotion_codes: true });
  assert.deepEqual(checkoutDiscountParams(undefined, "pro_month"), { allow_promotion_codes: false });
});

test("never both parameters, whatever the inputs", () => {
  for (const coupon of [undefined, null, "", "storyloop_founding_centre_50", "storyloop_referral_10"]) {
    for (const offer of [null, "pro_month"]) {
      const keys = Object.keys(checkoutDiscountParams(coupon, offer));
      assert.equal(keys.length, 1, `coupon=${coupon} offer=${offer} sent ${keys.join(", ")}`);
    }
  }
});
