import assert from "node:assert/strict";
import test from "node:test";
import {
  CENTRE_TRIAL_DAYS,
  INDIVIDUAL_TRIAL_DAYS,
  checkoutTerms,
  isCouponRefusal,
  spotsFromCoupon,
  trialLapsedWithoutCard,
} from "../lib/centre-offer";
import { priceMatchesPlan, resolveVerifiedPriceId, resetVerifiedPriceCache } from "../lib/stripe-prices";
import { renderLifecycleEmail } from "../lib/email/templates";

const COUPON = "storyloop_founding_centre_50";

test("individual plans keep the 7-day trial with a card, and never get the founding coupon", () => {
  for (const plan of ["educator", "educator_pro"] as const) {
    assert.deepEqual(checkoutTerms({ plan, spotsLeft: 10, hadCentreBefore: false, couponId: COUPON }), {
      trialDays: INDIVIDUAL_TRIAL_DAYS,
      noCardNeeded: false,
      foundingCoupon: null,
    });
  }
});

test("a new centre gets 30 days free with no card, and a founding spot while any remain", () => {
  for (const plan of ["centre_starter", "centre_growth"] as const) {
    assert.deepEqual(checkoutTerms({ plan, spotsLeft: 3, hadCentreBefore: false, couponId: COUPON }), {
      trialDays: CENTRE_TRIAL_DAYS,
      noCardNeeded: true,
      foundingCoupon: COUPON,
    });
  }
  const full = checkoutTerms({ plan: "centre_starter", spotsLeft: 0, hadCentreBefore: false, couponId: COUPON });
  assert.equal(full.foundingCoupon, null, "no spots, no coupon");
  assert.equal(full.trialDays, CENTRE_TRIAL_DAYS, "but the free month stays");
  const unknown = checkoutTerms({ plan: "centre_starter", spotsLeft: null, hadCentreBefore: false, couponId: COUPON });
  assert.equal(unknown.foundingCoupon, COUPON, "when Stripe cannot be asked, try it; Stripe refuses a spent coupon");
});

test("one free month per centre: a returning centre subscribes with a card and no trial", () => {
  assert.deepEqual(checkoutTerms({ plan: "centre_growth", spotsLeft: 5, hadCentreBefore: true, couponId: COUPON }), {
    trialDays: 0,
    noCardNeeded: false,
    foundingCoupon: null,
  });
});

test("spots left come from the coupon's own counters", () => {
  assert.equal(spotsFromCoupon({ max_redemptions: 10, times_redeemed: 0, valid: true }), 10);
  assert.equal(spotsFromCoupon({ max_redemptions: 10, times_redeemed: 7, valid: true }), 3);
  assert.equal(spotsFromCoupon({ max_redemptions: 10, times_redeemed: 12, valid: true }), 0, "never negative");
  assert.equal(spotsFromCoupon({ max_redemptions: 10, times_redeemed: 2, valid: false }), 0, "an invalid coupon has no spots");
  assert.equal(spotsFromCoupon(null), null);
});

test("a spent coupon is recognised, so checkout can retry without it", () => {
  assert.equal(isCouponRefusal({ code: "coupon_expired" }), true);
  assert.equal(isCouponRefusal({ message: "The coupon storyloop_founding_centre_50 has expired or been fully redeemed." }), true);
  assert.equal(isCouponRefusal({ code: "card_declined", message: "Your card was declined." }), false);
  assert.equal(isCouponRefusal(null), false);
});

test("a no-card free month running out is told apart from a cancellation", () => {
  const trialEnd = 1_790_000_000;
  const lapsed = { trial_end: trialEnd, ended_at: trialEnd + 60, default_payment_method: null, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } };
  assert.equal(trialLapsedWithoutCard(lapsed), true);
  assert.equal(trialLapsedWithoutCard({ ...lapsed, default_payment_method: "pm_1" }), false, "a card was on file");
  assert.equal(trialLapsedWithoutCard({ ...lapsed, ended_at: trialEnd + 20 * 86_400 }), false, "ended long after the trial: a real cancellation");
  assert.equal(trialLapsedWithoutCard({ ...lapsed, trial_settings: null }), false, "an individual trial that took a card");
});

test("a Stripe price is only used when it charges exactly the advertised amount", () => {
  const monthly = { active: true, currency: "nzd", unit_amount: 10900, recurring: { interval: "month", interval_count: 1 } };
  assert.equal(priceMatchesPlan(monthly, 10900, "NZD"), true);
  assert.equal(priceMatchesPlan({ ...monthly, unit_amount: 5500 }, 10900, "NZD"), false, "the old NZ$55 centre price");
  assert.equal(priceMatchesPlan({ ...monthly, currency: "aud" }, 10900, "NZD"), false);
  assert.equal(priceMatchesPlan({ ...monthly, recurring: { interval: "year" } }, 10900, "NZD"), false);
  assert.equal(priceMatchesPlan({ ...monthly, active: false }, 10900, "NZD"), false);
});

test("a wrong configured price is skipped for the right known one", async () => {
  resetVerifiedPriceCache();
  const prices: Record<string, object> = {
    price_old_55: { active: true, currency: "nzd", unit_amount: 5500, recurring: { interval: "month" } },
    price_1Txxpo1eBrPYVPx1JuyK3z6v: { active: true, currency: "nzd", unit_amount: 10900, recurring: { interval: "month" } },
  };
  const stripe = { prices: { retrieve: async (id: string) => { if (!prices[id]) throw new Error("missing"); return prices[id]; } } };
  const before = process.env.STRIPE_PRICE_CENTRE_NZD;
  process.env.STRIPE_PRICE_CENTRE_NZD = "price_old_55";
  try {
    assert.equal(await resolveVerifiedPriceId(stripe, "centre_starter", "NZD", 10900, { live: true }), "price_1Txxpo1eBrPYVPx1JuyK3z6v");
    resetVerifiedPriceCache();
    assert.equal(await resolveVerifiedPriceId(stripe, "centre_starter", "NZD", 10900, { live: false }), null, "not live: build it inline instead");
  } finally {
    if (before === undefined) delete process.env.STRIPE_PRICE_CENTRE_NZD; else process.env.STRIPE_PRICE_CENTRE_NZD = before;
    resetVerifiedPriceCache();
  }
});

test("the ended email never tells a trialing centre it was charged", () => {
  const lapsed = renderLifecycleEmail({ type: "subscription_cancelled", userId: "u", recipient: "a@b.nz", name: "Aroha", context: { trialLapsed: true } });
  assert.match(lapsed.subject, /free month has ended/);
  assert.match(lapsed.text, /nothing was charged/i);
  assert.doesNotMatch(lapsed.text, /charged again/);
  const cancelled = renderLifecycleEmail({ type: "subscription_cancelled", userId: "u", recipient: "a@b.nz", name: "Aroha" });
  assert.match(cancelled.subject, /subscription has ended/);
});

test("a centre with no card is told how to keep going, not that a payment will be taken", () => {
  const noCard = renderLifecycleEmail({ type: "trial_ending", userId: "u", recipient: "a@b.nz", name: "Aroha", context: { centreTrial: true, cardOnFile: false, trialEndsOn: "20 October 2026" } });
  assert.match(noCard.subject, /free month ends on 20 October 2026/);
  assert.match(noCard.text, /add a card/i);
  assert.doesNotMatch(noCard.text, /payment of/);
  const withCard = renderLifecycleEmail({ type: "trial_ending", userId: "u", recipient: "a@b.nz", name: "Aroha", context: { centreTrial: true, cardOnFile: true } });
  assert.match(withCard.text, /first payment/);
});
