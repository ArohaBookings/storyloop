import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { statementTodayLine, statementWallPaysToday } from "../lib/wall-offer";

test("the statement wall's checkout has no free week; the story wall keeps its 7 days", () => {
  assert.equal(statementWallPaysToday({ switchOn: true, wall: "statement", specialOffer: false, centrePlan: false }), true);
  assert.equal(statementWallPaysToday({ switchOn: true, wall: "story", specialOffer: false, centrePlan: false }), false);
  assert.equal(statementWallPaysToday({ switchOn: true, wall: null, specialOffer: false, centrePlan: false }), false);
  assert.equal(statementWallPaysToday({ switchOn: true, wall: "statement", specialOffer: true, centrePlan: false }), false);
  assert.equal(statementWallPaysToday({ switchOn: true, wall: "statement", specialOffer: false, centrePlan: true }), false);
  const route = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(route, /\? \{ \.\.\.baseTerms, trialDays: 0 \}\s*: baseTerms;/);
  // Stripe refuses trial_period_days: 0, so none is sent.
  assert.match(route, /terms\.trialDays > 0 \? \{ trial_period_days: terms\.trialDays \} : \{\}/);
});

test("STATEMENTS_PAY_TODAY off: the statement wall's checkout keeps the free week as before", () => {
  assert.equal(statementWallPaysToday({ switchOn: false, wall: "statement", specialOffer: false, centrePlan: false }), false);
  assert.match(readFileSync("app/api/stripe/checkout/route.ts", "utf8"), /statementWallPaysToday\(\{ switchOn: STATEMENTS_PAY_TODAY,/);
});

test("the today line, from the same discount checkout applies", () => {
  assert.equal(statementTodayLine("NZD", "none"), "NZ$21 today, then NZ$21 a month.");
  assert.equal(statementTodayLine("AUD", "none"), "A$19 today, then A$19 a month.");
  assert.equal(statementTodayLine("NZD", "activation"), "NZ$10.50 today and next month, then NZ$21 a month.");
  assert.equal(statementTodayLine("NZD", "referral"), "Nothing today: your first month is free, then NZ$21 a month.");
});
