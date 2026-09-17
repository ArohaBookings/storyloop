import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVATION_OFFER_LABEL } from "../lib/email/config";
import {
  ACTIVATION_PERCENT_OFF,
  CREATED_ACTIVATION_COUPON_ID,
  EXISTING_ACTIVATION_COUPON_ID,
  resolveActivationCoupon,
} from "../lib/activation-offer";

type Coupon = { id: string; valid: boolean; percent_off: number | null; duration: string };

function fakeCoupons(existing: Coupon[], { failCreate = false } = {}) {
  const created: unknown[] = [];
  const api = {
    retrieve: async (id: string) => {
      const found = existing.find((c) => c.id === id);
      if (!found) throw new Error("No such coupon");
      return found;
    },
    create: async (params: { id: string }) => {
      if (failCreate) throw new Error("Stripe down");
      created.push(params);
      return { id: params.id, valid: true, percent_off: 15, duration: "once" };
    },
  };
  return { api: api as never, created };
}

test("a configured coupon id always wins, with no Stripe calls", async () => {
  const { api, created } = fakeCoupons([]);
  assert.equal(await resolveActivationCoupon(api, "coupon_from_env"), "coupon_from_env");
  assert.equal(created.length, 0);
});

test("without configuration the live StoryLoop activation coupon is used", async () => {
  const { api, created } = fakeCoupons([{ id: EXISTING_ACTIVATION_COUPON_ID, valid: true, percent_off: 15, duration: "once" }]);
  assert.equal(await resolveActivationCoupon(api, undefined), EXISTING_ACTIVATION_COUPON_ID);
  assert.equal(created.length, 0);
});

test("a coupon that no longer matches the promise is not used", async () => {
  const { api, created } = fakeCoupons([{ id: EXISTING_ACTIVATION_COUPON_ID, valid: false, percent_off: 15, duration: "once" }]);
  assert.equal(await resolveActivationCoupon(api, ""), CREATED_ACTIVATION_COUPON_ID);
  assert.equal(created.length, 1);

  const wrongAmount = fakeCoupons([{ id: EXISTING_ACTIVATION_COUPON_ID, valid: true, percent_off: 50, duration: "once" }]);
  assert.equal(await resolveActivationCoupon(wrongAmount.api, null), CREATED_ACTIVATION_COUPON_ID);
});

test("if Stripe cannot provide a coupon, checkout carries on without one", async () => {
  const { api } = fakeCoupons([], { failCreate: true });
  assert.equal(await resolveActivationCoupon(api, undefined), undefined);
});

test("the discount emails promise is the discount this applies", () => {
  if (!process.env.STRIPE_FIRST_MONTH_COUPON_LABEL) {
    assert.equal(ACTIVATION_OFFER_LABEL, `${ACTIVATION_PERCENT_OFF}% off your first month`);
  }
});
