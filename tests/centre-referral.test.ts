import assert from "node:assert/strict";
import test from "node:test";
import { CENTRE_REFERRAL_MONTHS, MAX_REFERRAL_CREDITS, planMonthlyAmountCents, referralCreditMonths } from "../lib/referrals";

test("a centre coming aboard is worth three months, an individual one", () => {
  assert.equal(referralCreditMonths("centre_starter"), CENTRE_REFERRAL_MONTHS);
  assert.equal(referralCreditMonths("centre_growth"), CENTRE_REFERRAL_MONTHS);
  assert.equal(referralCreditMonths("educator"), 1);
  assert.equal(referralCreditMonths("educator_pro"), 1);
});

test("the old alias for a centre plan still earns the centre reward", () => {
  // normalizePlanKey maps the legacy "centre" to centre_starter. An educator
  // whose referral landed on an older plan row must not be quietly underpaid.
  assert.equal(referralCreditMonths("centre"), CENTRE_REFERRAL_MONTHS);
});

test("an unknown or missing plan never earns more than the ordinary reward", () => {
  for (const value of [null, undefined, "", "free", "enterprise", 42, {}, []]) {
    assert.equal(referralCreditMonths(value), 1, `${JSON.stringify(value)} must not earn a centre reward`);
  }
});

test("the reward stays plainly payable for StoryLoop", () => {
  // The incentive has to survive contact with a spreadsheet or it gets pulled.
  const centreMonthly = planMonthlyAmountCents("centre_starter", "NZD");
  const educatorMonthly = planMonthlyAmountCents("educator", "NZD");
  const rewardCost = educatorMonthly * CENTRE_REFERRAL_MONTHS;
  assert.ok(rewardCost < centreMonthly, `a reward of ${rewardCost}c must cost less than one month of the centre plan (${centreMonthly}c)`);
  // Worst case: every one of an educator's allowed referrals is a centre.
  const worstCaseCost = rewardCost * MAX_REFERRAL_CREDITS;
  const revenueBrought = centreMonthly * 12 * MAX_REFERRAL_CREDITS;
  assert.ok(worstCaseCost * 20 < revenueBrought, "even the maximum payout must be small against the revenue it brings");
});

test("plan pricing is read per currency, so an Australian referrer is not paid in the wrong money", () => {
  assert.equal(planMonthlyAmountCents("educator", "NZD"), 2100);
  assert.equal(planMonthlyAmountCents("educator", "AUD"), 1900);
  assert.equal(planMonthlyAmountCents("free", "NZD"), 0, "a free plan has no monthly value to credit");
});
