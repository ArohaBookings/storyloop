import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVATION_OFFER_LABEL as EMAIL_LABEL } from "../lib/email/config";
import {
  ACTIVATION_COUPON_ID,
  ACTIVATION_MONTHS,
  ACTIVATION_OFFER_LABEL,
  ACTIVATION_PERCENT_OFF,
  ensureActivationCoupon,
  isActivationCoupon,
} from "../lib/activation-offer";
import { checkoutTermsMessage } from "../lib/stripe-branding";
import { renderLifecycleEmail } from "../lib/email/templates";

type Coupon = { id: string; valid?: boolean; percent_off: number | null; duration: string; duration_in_months?: number | null };

function fakeCoupons(existing: Coupon[], { failCreate = false } = {}) {
  const created: Array<Record<string, unknown>> = [];
  const api = {
    retrieve: async (id: string) => {
      const found = existing.find((c) => c.id === id);
      if (!found) throw new Error("No such coupon");
      return found;
    },
    create: async (params: Record<string, unknown>) => {
      if (failCreate) throw new Error("Stripe down");
      created.push(params);
      return { valid: true, ...params } as unknown as Coupon;
    },
  };
  return { api, created };
}

const EXACT: Coupon = { id: ACTIVATION_COUPON_ID, valid: true, percent_off: 50, duration: "repeating", duration_in_months: 2 };

test("the early-educator offer is 50% off the first 2 months (Leo, 3 Nov 2026)", () => {
  assert.equal(ACTIVATION_PERCENT_OFF, 50);
  assert.equal(ACTIVATION_MONTHS, 2);
  assert.equal(ACTIVATION_OFFER_LABEL, "50% off your first 2 months");
  // Emails take their wording from the same constant: there is no setting left to drift.
  assert.equal(EMAIL_LABEL, ACTIVATION_OFFER_LABEL);
});

test("only a coupon with exactly the offer's terms counts", () => {
  assert.equal(isActivationCoupon(EXACT), true);
  assert.equal(isActivationCoupon({ ...EXACT, valid: false }), false);
  assert.equal(isActivationCoupon({ ...EXACT, percent_off: 15, duration: "once", duration_in_months: null }), false);
  assert.equal(isActivationCoupon({ ...EXACT, duration_in_months: 3 }), false);
  assert.equal(isActivationCoupon({ ...EXACT, duration: "forever" }), false);
  assert.equal(isActivationCoupon(null), false);
});

test("the live coupon is used as it is, with nothing created", async () => {
  const { api, created } = fakeCoupons([EXACT]);
  assert.equal(await ensureActivationCoupon(api), ACTIVATION_COUPON_ID);
  assert.equal(created.length, 0);
});

test("a missing coupon is created with exactly the offer's terms", async () => {
  const { api, created } = fakeCoupons([]);
  assert.equal(await ensureActivationCoupon(api), ACTIVATION_COUPON_ID);
  assert.equal(created.length, 1);
  assert.deepEqual(
    { id: created[0].id, percent_off: created[0].percent_off, duration: created[0].duration, duration_in_months: created[0].duration_in_months },
    { id: ACTIVATION_COUPON_ID, percent_off: 50, duration: "repeating", duration_in_months: 2 },
  );
});

test("a coupon with other terms, or no coupon at all, stops checkout instead of charging full price", async () => {
  const wrong = fakeCoupons([{ ...EXACT, percent_off: 15, duration: "once", duration_in_months: null }]);
  await assert.rejects(() => ensureActivationCoupon(wrong.api), /does not match/);
  const down = fakeCoupons([], { failCreate: true });
  await assert.rejects(() => ensureActivationCoupon(down.api));
});

test("checkout says exactly what will be charged: trial, then two half-price months, then full price", () => {
  const now = new Date("2026-11-03T00:00:00Z");
  const terms = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, activation: true, now });
  assert.match(terms, /Nothing is charged until 10 November 2026/);
  assert.match(terms, /first 2 months are then half price, NZ\$10\.50 a month, then NZ\$21 a month/);
  const plain = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now });
  assert.doesNotMatch(plain, /half price/);
});

test("the trial-ending email restates the half-price months", () => {
  const email = renderLifecycleEmail({
    type: "trial_ending",
    userId: "u",
    recipient: "a@b.com",
    name: "Sam",
    context: { planLabel: "Educator", amountLabel: "NZ$21", trialEndsOn: "10 November 2026", discountedMonths: 2, discountPercent: 50 },
  });
  assert.match(email.text, /half price for your first 2 months, as offered/);
  assert.doesNotMatch(email.text, /first payment of NZ\$21 will be taken/);
});

test("the offer emails promise exactly the label, on the plans it applies to", () => {
  for (const type of ["two_free_stories_used", "free_limit_reached"] as const) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    assert.match(email.html, /50% off your first 2 months of Educator or Educator Pro/);
    assert.doesNotMatch(email.html + email.text, /15%/);
    assert.match(email.ctaUrl ?? "", /offer=activation/);
  }
});

test("every coupon StoryLoop can create has a name Stripe accepts (40 characters at most)", async () => {
  // 3 Nov 2026: the live API refused "StoryLoop welcome back - 50% off 2 months"
  // (41 characters). The local Stripe mock never checked, so the first real
  // welcome-back checkout would have stopped with "could not be applied".
  const { ensureWinbackCoupon } = await import("../lib/offers");
  const { getOrCreateReferralCoupon } = await import("../lib/referrals");
  const names: string[] = [];
  const recorder = {
    retrieve: async () => { throw new Error("No such coupon"); },
    create: async (params: Record<string, unknown>) => {
      names.push(String(params.name));
      return { valid: true, ...params } as never;
    },
  };
  await ensureActivationCoupon(recorder);
  await ensureWinbackCoupon(recorder as never);
  await getOrCreateReferralCoupon({ coupons: recorder } as never);
  assert.equal(names.length, 3);
  for (const name of names) assert.ok(name.length <= 40, `${name} is ${name.length} characters`);
});
