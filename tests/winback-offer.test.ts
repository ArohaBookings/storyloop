import assert from "node:assert/strict";
import test from "node:test";
import { WINBACK_COUPON_ID, WINBACK_LABEL, WINBACK_MONTHS, WINBACK_PERCENT_OFF, ensureWinbackCoupon, isWinbackCoupon, winbackEligibility } from "../lib/offers";
import { checkoutTermsMessage } from "../lib/stripe-branding";
import { renderLifecycleEmail } from "../lib/email/templates";

const NOW = new Date("2026-11-03T10:00:00Z");
const live = { expires_at: "2026-11-17T10:00:00Z", redeemed_at: null };
const cancelled = { plan: "free", subscription_status: "cancelled" };

// Leo, 3 Nov 2026: "if someone gets an email about the discount it better be applied".
test("the welcome-back offer is for a cancelled payer holding a live, unused grant, and nobody else", () => {
  assert.deepEqual(winbackEligibility({ profile: cancelled, grant: live, now: NOW }), { eligible: true });
  assert.equal(winbackEligibility({ profile: { plan: "free", subscription_status: null }, grant: live, now: NOW }).eligible, false, "never paid");
  assert.equal(winbackEligibility({ profile: { plan: "educator", subscription_status: "active" }, grant: live, now: NOW }).eligible, false, "paying now");
  assert.equal(winbackEligibility({ profile: cancelled, grant: null, now: NOW }).eligible, false, "no grant, no offer");
  assert.equal(winbackEligibility({ profile: cancelled, grant: { ...live, redeemed_at: "2026-11-05T00:00:00Z" }, now: NOW }).eligible, false, "used once");
  assert.equal(winbackEligibility({ profile: cancelled, grant: { ...live, expires_at: "2026-11-02T00:00:00Z" }, now: NOW }).eligible, false, "expired");
  assert.equal(winbackEligibility({ profile: { ...cancelled, is_internal: true }, grant: live, now: NOW }).eligible, false, "internal");
});

test("checkout only ever applies a coupon that is exactly the email's terms", async () => {
  assert.equal(WINBACK_PERCENT_OFF, 50);
  assert.equal(WINBACK_MONTHS, 2);
  assert.ok(isWinbackCoupon({ percent_off: 50, duration: "repeating", duration_in_months: 2, valid: true }));
  for (const wrong of [{ percent_off: 15, duration: "once" }, { percent_off: 50, duration: "repeating", duration_in_months: 3 }, { percent_off: 50, duration: "repeating", duration_in_months: 2, valid: false }, null]) {
    assert.equal(isWinbackCoupon(wrong as never), false, JSON.stringify(wrong));
  }
  // Missing: created with the exact terms.
  let created: Record<string, unknown> | null = null;
  const id = await ensureWinbackCoupon({
    retrieve: async () => { throw new Error("No such coupon"); },
    create: async (params) => { created = params; return { id: String(params.id), percent_off: params.percent_off as number, duration: params.duration as string, duration_in_months: params.duration_in_months as number, valid: true }; },
  });
  assert.equal(id, WINBACK_COUPON_ID);
  assert.deepEqual({ p: created!.percent_off, d: created!.duration, m: created!.duration_in_months }, { p: 50, d: "repeating", m: 2 });
  // Present but different: refused, never applied.
  await assert.rejects(ensureWinbackCoupon({
    retrieve: async () => ({ id: WINBACK_COUPON_ID, percent_off: 30, duration: "repeating", duration_in_months: 2, valid: true }),
    create: async () => { throw new Error("should not create"); },
  }));
});

test("checkout's own line states the real half price and the full price after it, in both currencies", () => {
  const aud = checkoutTermsMessage({ plan: "educator", currency: "AUD", trialDays: 0, noCardNeeded: false, founding: false, offer: null, winback: true });
  assert.ok(aud.startsWith("Welcome back: Educator is half price for your first 2 months, A$9.50 a month, then A$19 a month."), aud);
  const nzd = checkoutTermsMessage({ plan: "educator_pro", currency: "NZD", trialDays: 0, noCardNeeded: false, founding: false, offer: null, winback: true });
  assert.ok(nzd.includes("Educator Pro is half price for your first 2 months, NZ$16.50 a month, then NZ$33 a month."), nzd);
});

test("the welcome-back email promises exactly the offer, with its claim-by date, and links to it", () => {
  const email = renderLifecycleEmail({ type: "winback_offer", userId: "u", recipient: "a@b.com", name: "Sam", context: { offerExpires: "Tuesday 17 November" } });
  assert.equal(WINBACK_LABEL, "50% off your first 2 months back");
  assert.ok(email.subject.includes(WINBACK_LABEL), email.subject);
  assert.ok(email.text.includes("50% off your first 2 months back, until Tuesday 17 November"), email.text);
  const cta = new URL(email.ctaUrl);
  assert.equal(`${cta.pathname}?offer=${cta.searchParams.get("offer")}`, "/billing?offer=winback");
  assert.ok(!/15%|first month/i.test(email.text), "no leftover activation wording");
});
