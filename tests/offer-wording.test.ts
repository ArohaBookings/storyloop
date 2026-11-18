import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CENTRE_FREE_UNTIL, CENTRE_TRIAL_DAYS, checkoutTerms } from "../lib/centre-offer";
import { getPlanByKey } from "../lib/plans";
import {
  CENTRE_TRIAL_EVERGREEN,
  centreOfferLine,
  centreOfferWording,
  currencyForTimeZone,
  educatorOffer,
  educatorPriceLine,
  educatorTrialLine,
  fillOfferText,
  hasOfferToken,
  priceLabel,
  splitOfferText,
} from "../lib/offer-wording";
import { LANDING_FAQS } from "../lib/landing-faqs";
import { SEO_PAGES } from "../lib/seo-pages";

// One source of truth for the offers' wording (lib/offer-wording.ts, 18 Nov 2026).

const at = (iso: string) => new Date(iso);

test("the Educator price is the plan's price, in the visitor's currency", () => {
  assert.equal(educatorOffer("NZD").priceLabel, "NZ$21");
  assert.equal(educatorOffer("AUD").priceLabel, "A$19");
  assert.equal(educatorPriceLine("NZD"), "NZ$21 a month");
  assert.equal(educatorPriceLine("AUD", "educator_pro"), "A$29 a month");
  for (const currency of ["NZD", "AUD"] as const) {
    assert.equal(educatorOffer(currency).price, getPlanByKey("educator").price[currency]);
  }
  assert.equal(priceLabel(109, "NZD"), "NZ$109");
});

test("the trial is the one checkout gives an individual plan, with a card", () => {
  const checkout = checkoutTerms({ plan: "educator", spotsLeft: null, hadCentreBefore: false, couponId: "" });
  const offer = educatorOffer("NZD");
  assert.equal(offer.trialDays, checkout.trialDays);
  assert.equal(offer.trialDays, 7);
  assert.equal(offer.cardNeeded, true);
  assert.equal(offer.trialLine, "7-day free trial");
  assert.equal(educatorTrialLine(), "7-day free trial");
  assert.equal(offer.offerLine, "7 days free, then NZ$21 a month.");
  assert.equal(educatorOffer("AUD").offerLine, "7 days free, then A$19 a month.");
  assert.doesNotMatch(offer.offerLine, /cancel|pause/i, "pause and cancel live on Billing only");
});

test("currency is picked the way the pricing page picks it", () => {
  assert.equal(currencyForTimeZone("Pacific/Auckland"), "NZD");
  assert.equal(currencyForTimeZone("Australia/Sydney"), "AUD");
  assert.equal(currencyForTimeZone("Europe/London"), "AUD");
  assert.equal(currencyForTimeZone(undefined), "AUD");
});

test("a centre starting in 2026 is free until 31 January", () => {
  const today = centreOfferWording(at("2026-11-18T11:00:00+13:00"));
  assert.equal(today.words, "free until 31 January");
  assert.equal(today.line, "Free until 31 January, no card needed");
  assert.equal(today.freeUntil?.getTime(), CENTRE_FREE_UNTIL.getTime());
  assert.equal(today.periodLabel, "Until 31 January");
  assert.ok(today.trialDays > CENTRE_TRIAL_DAYS);
});

test("around 1 January 2027 (New Zealand time) the words switch with the offer", () => {
  const lastSecond = at("2026-12-31T23:59:59+13:00");
  const firstSecond = at("2027-01-01T00:00:00+13:00");
  assert.equal(centreOfferLine(lastSecond), "Free until 31 January, no card needed");
  assert.equal(centreOfferWording(lastSecond).trialDays, 31);
  assert.equal(centreOfferLine(firstSecond), "30 days free, no card needed");
  assert.equal(centreOfferWording(firstSecond).trialDays, 30);
  assert.equal(centreOfferWording(firstSecond).freeUntil, null);
  assert.equal(centreOfferWording(firstSecond).periodLabel, "First 30 days");
  // Still 31 December in Sydney when New Zealand is already in 2027: New Zealand time decides.
  assert.equal(centreOfferLine(at("2027-01-01T00:30:00+11:00")), "30 days free, no card needed");
});

test("around 31 January 2027 it is 30 days, never the old end date", () => {
  for (const iso of ["2027-01-30T12:00:00+13:00", "2027-01-31T23:59:59+13:00", "2027-02-01T00:00:00+13:00", "2027-06-01T09:00:00+12:00"]) {
    const wording = centreOfferWording(at(iso));
    assert.equal(wording.line, "30 days free, no card needed", iso);
    assert.equal(wording.trialDays, 30, iso);
  }
});

test("the words always match what checkout grants on the same day", () => {
  for (const iso of ["2026-11-18T09:00:00+13:00", "2026-12-31T23:59:59+13:00", "2027-01-01T00:00:00+13:00", "2027-01-31T12:00:00+13:00"]) {
    const terms = checkoutTerms({ plan: "centre_starter", spotsLeft: 3, hadCentreBefore: false, couponId: "x", now: at(iso) });
    assert.equal(centreOfferWording(at(iso)).trialDays, terms.trialDays, iso);
    assert.equal(terms.noCardNeeded, true);
  }
});

test("tokens: filled for the day, or with wording true on every date", () => {
  const text = "Centres are {centre_trial} with no card. {Centre_trial}, no card needed.";
  assert.equal(fillOfferText(text, at("2026-12-01T09:00:00+13:00")), "Centres are free until 31 January with no card. Free until 31 January, no card needed.");
  assert.equal(fillOfferText(text, at("2027-01-02T09:00:00+13:00")), "Centres are 30 days free with no card. 30 days free, no card needed.");
  assert.equal(fillOfferText(text, at("2026-12-01T09:00:00+13:00"), { evergreen: true }), "Centres are at least 30 days free with no card. At least 30 days free, no card needed.");
  assert.equal(CENTRE_TRIAL_EVERGREEN, "at least 30 days free");
  assert.deepEqual(splitOfferText("A {Centre_trial} b"), [
    { kind: "text", text: "A " },
    { kind: "centre_trial", capital: true },
    { kind: "text", text: " b" },
  ]);
  assert.deepEqual(splitOfferText("no token"), [{ kind: "text", text: "no token" }]);
});

test("no page states the old centre trial any more", () => {
  const files = [
    "app/(app)/billing/page.tsx",
    "app/ai-policy/page.tsx",
    "app/features/page.tsx",
    "components/landing/Pricing.tsx",
    "lib/landing-faqs.ts",
    "lib/plans.ts",
    "lib/seo-deep-dives.ts",
    "lib/seo-pages.ts",
    "components/centre/FoundingCentreOffer.tsx",
    "app/data-sheet/page.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /30 days free|Start 30 days|30-day free month|at least 30 days free|trialDays\} days free|TRIAL_DAYS\} days free/i, file);
  }
});

test("the centre and pricing guides carry the day's words, and their search text names no free period", () => {
  const centres = SEO_PAGES["for-centres"];
  // 18 Nov 2026 re-aim: the intro says what it is and how to judge it; the free
  // period is in the line under the button (CentreTrialWords) and in a section.
  assert.ok(centres.sections.some((section) => hasOfferToken(section.title) && hasOfferToken(section.body)));
  assert.equal(
    centres.description,
    "Your team writes learning stories in the day from a short note, linked to Te Whāriki or the EYLF. One flat price, no per-child fee, and no card to start.",
  );
  assert.doesNotMatch(`${centres.title} ${centres.description} ${centres.intro}`, /\d+ days|free until/i);
  const pricing = SEO_PAGES["pricing"];
  assert.ok(pricing.faqs.filter((faq) => hasOfferToken(faq.answer)).length === 2);
  assert.ok(LANDING_FAQS.some((faq) => hasOfferToken(faq.a)));
  const cost = LANDING_FAQS.find((faq) => faq.q === "How much does it cost?");
  assert.match(fillOfferText(cost?.a ?? "", at("2026-11-18T09:00:00+13:00")), /centre plans are free until 31 January with no card/);
});
