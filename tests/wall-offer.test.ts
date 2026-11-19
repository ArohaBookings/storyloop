import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { activationMonthly, educatorCheckoutDiscount, educatorCheckoutLine, moneyLabel, type DiscountFacts } from "../lib/wall-offer";
import { getPlanByKey } from "../lib/plans";

// The wall states the money checkout will really charge that account (release decision 1, 19 Nov 2026).

const freeAccount: DiscountFacts = { specialOffer: false, centrePlan: false, referred: false, firstSubscription: true, activationAsked: true, accountPlan: "free" };

test("the early-educator offer, as money, in both currencies", () => {
  assert.equal(educatorCheckoutLine("NZD", "activation"), "7 days free, then NZ$10.50 a month for 2 months, then NZ$21 a month.");
  assert.equal(educatorCheckoutLine("AUD", "activation"), "7 days free, then A$9.50 a month for 2 months, then A$19 a month.");
});

test("a referral's first month free, and the plain price", () => {
  assert.equal(educatorCheckoutLine("NZD", "referral"), "7 days free, then your first month free, then NZ$21 a month.");
  assert.equal(educatorCheckoutLine("NZD", "none"), "7 days free, then NZ$21 a month.");
  assert.equal(educatorCheckoutLine("AUD", "none"), "7 days free, then A$19 a month.");
});

test("the numbers come from the locked plan prices, never typed", () => {
  for (const currency of ["NZD", "AUD"] as const) {
    const price = getPlanByKey("educator").price[currency];
    assert.equal(activationMonthly(price) * 2, price, "half price");
    assert.ok(educatorCheckoutLine(currency, "activation").includes(moneyLabel(price, currency) + " a month."));
  }
  assert.equal(moneyLabel(10.5, "NZD"), "NZ$10.50");
  assert.equal(moneyLabel(21, "NZD"), "NZ$21");
  assert.equal(moneyLabel(9.5, "AUD"), "A$9.50");
});

test("which discount checkout applies, in checkout's own order", () => {
  assert.equal(educatorCheckoutDiscount(freeAccount), "activation", "a free account: half price for two months");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, referred: true }), "referral", "referred, first subscription: the free month comes first");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, referred: true, firstSubscription: false }), "activation", "a referral used before: back to half price");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, accountPlan: "educator" }), "none", "not on the free plan: the plain price");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, activationAsked: false }), "none");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, centrePlan: true }), "none");
  assert.equal(educatorCheckoutDiscount({ ...freeAccount, specialOffer: true }), "none");
});

test("checkout still decides the same way the wall reads it", () => {
  const checkout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(checkout, /if \(!offer && !isCentrePlan\(selectedPlan\)\) \{/, "the referral is looked at for any educator checkout without a special offer");
  assert.match(checkout, /if \(referralRow && firstSubscription\) \{/);
  assert.match(checkout, /if \(!offer && !referralCoupon && activationOffer === true && profile\.plan === "free" && !isCentrePlan\(selectedPlan\)\) \{/);
  const server = readFileSync("lib/wall-offer-server.ts", "utf8");
  assert.match(server, /from\("referrals"\)\.select\("id"\)\.eq\("referred_user_id", userId\)/);
  assert.match(server, /stripe\.subscriptions\.list\(\{ customer: stripeCustomerId, status: "all", limit: 1 \}\)/);
  assert.match(server, /firstSubscription = false;/, "unknown history is not a first subscription, as in checkout");
  const route = readFileSync("app/api/stripe/checkout-offer/route.ts", "utf8");
  assert.match(route, /status: 401/, "her own account only");
  assert.match(route, /discount: "none"/, "unreadable: the plain price, never a discount checkout might not give");
  assert.doesNotMatch(route, /\.update\(|\.insert\(|\.upsert\(|\.delete\(/, "read only");
});

test("the wall's 'My centre should pay' sends the story she just wrote through the existing leader check", () => {
  const wall = readFileSync("components/app/AppLimitWall.tsx", "utf8");
  assert.match(wall, /if \(key === "centre_should_pay" && leaderStoryId\) void sendToLeader\(leaderStoryId\);/);
  assert.match(wall, /fetch\(`\/api\/stories\/\$\{encodeURIComponent\(storyId\)\}\/check`/);
  assert.match(wall, /trackEvent\("leader_check_sent", \{ centre_name: false, counts: false, story_id: storyId \}\)/);
  assert.doesNotMatch(wall.replace(/\/\*[\s\S]*?\*\//g, ""), /\b(pause|cancel)\b/i, "nothing about pause or cancel");
  const page = readFileSync("app/(app)/generate/page.tsx", "utf8");
  assert.match(page, /leaderStoryId=\{story && storyId \? storyId : undefined\}/);
});
