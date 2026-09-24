import assert from "node:assert/strict";
import test from "node:test";
import {
  OFFER_REASON_COPY,
  PRO_MONTH_TRIAL_DAYS,
  isPayingAccount,
  proMonthAudience,
  proMonthEligibility,
  proMonthFirstChargeDate,
} from "../lib/offers";
import { checkoutTermsMessage, isBrandingRefusal, CHECKOUT_BRANDING } from "../lib/stripe-branding";
import { matchSuffix } from "../lib/pwned-passwords";
import { renderLifecycleEmail } from "../lib/email/templates";

const NOW = new Date("2026-09-24T00:00:00Z");
const future = "2026-10-08T00:00:00Z";
const past = "2026-09-20T00:00:00Z";
const free = { plan: "free", subscription_status: null, stripe_subscription_id: null, is_internal: false, is_active: true };

test("a free educator with an unexpired, unredeemed grant can claim the free month", () => {
  assert.deepEqual(proMonthEligibility({ profile: free, grant: { expires_at: future }, isCentreMember: false, now: NOW }), { eligible: true });
});

test("paying customers are never offered it, whatever the profile says", () => {
  for (const profile of [
    { ...free, plan: "educator" },
    { ...free, subscription_status: "active" },
    { ...free, subscription_status: "past_due" },
    { ...free, subscription_status: "trialing" },
    // A subscription id with no proof it ended counts as charging.
    { ...free, stripe_subscription_id: "sub_123", subscription_status: null },
  ]) {
    assert.equal(isPayingAccount(profile), true, JSON.stringify(profile));
    assert.deepEqual(proMonthEligibility({ profile, grant: { expires_at: future }, isCentreMember: false, now: NOW }), { eligible: false, reason: "already_paid" });
  }
  // An ended subscription is not paying.
  assert.equal(isPayingAccount({ ...free, stripe_subscription_id: "sub_123", subscription_status: "cancelled" }), false);
});

test("no grant, a used grant, an expired grant, a centre seat and internal accounts are refused with a reason", () => {
  const cases: Array<[Parameters<typeof proMonthEligibility>[0], string]> = [
    [{ profile: free, grant: null, isCentreMember: false, now: NOW }, "no_offer"],
    [{ profile: free, grant: { expires_at: future, redeemed_at: "2026-09-23T00:00:00Z" }, isCentreMember: false, now: NOW }, "redeemed"],
    [{ profile: free, grant: { expires_at: past }, isCentreMember: false, now: NOW }, "expired"],
    [{ profile: free, grant: { expires_at: future }, isCentreMember: true, now: NOW }, "centre_member"],
    [{ profile: { ...free, is_internal: true }, grant: { expires_at: future }, isCentreMember: false, now: NOW }, "internal"],
    [{ profile: { ...free, is_active: false }, grant: { expires_at: future }, isCentreMember: false, now: NOW }, "inactive"],
    [{ profile: null, grant: { expires_at: future }, isCentreMember: false, now: NOW }, "inactive"],
  ];
  for (const [input, reason] of cases) {
    const result = proMonthEligibility(input);
    assert.equal(result.eligible, false);
    assert.equal(!result.eligible && result.reason, reason);
    assert.ok(OFFER_REASON_COPY[reason as keyof typeof OFFER_REASON_COPY].length > 20);
  }
});

test("the audience leaves out payers, centre seats, unsubscribes, the already-offered and bad emails", () => {
  const profiles = [
    { id: "a", email: "a@x.nz", ...free },
    { id: "b", email: "b@x.nz", ...free, plan: "educator_pro" },
    { id: "c", email: "c@x.nz", ...free },
    { id: "d", email: "D@X.NZ", ...free },
    { id: "e", email: "e@x.nz", ...free },
    { id: "f", email: "", ...free },
    { id: "g", email: "g@x.nz", ...free, is_internal: true },
    { id: "h", email: "h@x.nz", ...free, marketing_unsubscribed_at: "2026-08-01T00:00:00Z" },
  ];
  const { include, excluded } = proMonthAudience({
    profiles,
    centreMemberIds: new Set(["c"]),
    unsubscribedEmails: new Set(["d@x.nz"]),
    alreadyGranted: new Set(["e"]),
  });
  assert.deepEqual(include.map((p) => p.id), ["a"]);
  assert.deepEqual(excluded, { already_paid: 1, centre_member: 1, unsubscribed: 2, already_offered: 1, no_email: 1, internal: 1 });
});

test("the first charge is exactly the trial length after starting", () => {
  assert.equal(PRO_MONTH_TRIAL_DAYS, 30);
  assert.equal(proMonthFirstChargeDate(NOW).toISOString(), "2026-10-24T00:00:00.000Z");
});

test("the checkout terms line states the free period, the date, the price and how not to pay", () => {
  const offer = checkoutTermsMessage({ plan: "educator_pro", currency: "NZD", trialDays: 30, noCardNeeded: false, founding: false, offer: "pro_month", now: NOW });
  assert.match(offer, /free month of Educator Pro/);
  assert.match(offer, /24 October 2026/);
  assert.match(offer, /NZ\$33 a month/);
  assert.match(offer, /Cancel or switch plans before then/);
  assert.match(offer, /Aria Care/);

  const trial = checkoutTermsMessage({ plan: "educator", currency: "AUD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now: NOW });
  assert.match(trial, /7-day free trial/);
  assert.match(trial, /1 October 2026/);
  assert.match(trial, /A\$19 a month/);

  const centre = checkoutTermsMessage({ plan: "centre_starter", currency: "NZD", trialDays: 30, noCardNeeded: true, founding: true, offer: null, now: NOW });
  assert.match(centre, /30 days free with no card/);
  assert.match(centre, /half price for three months, then NZ\$109 a month/);
  assert.match(centre, /nothing is charged/);

  const returning = checkoutTermsMessage({ plan: "centre_growth", currency: "AUD", trialDays: 0, noCardNeeded: false, founding: false, offer: null, now: NOW });
  assert.match(returning, /A\$199 a month/);
  for (const message of [offer, trial, centre, returning]) assert.ok(message.length < 1200, "Stripe's limit");
});

test("checkout shows StoryLoop, and only a branding refusal triggers the unbranded retry", () => {
  assert.equal(CHECKOUT_BRANDING.display_name, "StoryLoop");
  assert.equal(isBrandingRefusal({ param: "branding_settings[logo][url]", message: "Invalid URL" }), true);
  assert.equal(isBrandingRefusal({ message: "Unknown parameter: branding_settings" }), true);
  assert.equal(isBrandingRefusal({ param: "discounts", message: "No such coupon" }), false);
  assert.equal(isBrandingRefusal(null), false);
});

test("breached-password matching finds the suffix and ignores padding", () => {
  const body = "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493";
  assert.equal(matchSuffix(body, "1E4C9B93F3F0682250B6CF8331B7EE68FD8"), 3861493);
  assert.equal(matchSuffix(body, "1e4c9b93f3f0682250b6cf8331b7ee68fd8"), 3861493);
  assert.equal(matchSuffix(body, "00D4F6E8FA6EECAD2A3AA415EEC418D38EC"), 0);
  assert.equal(matchSuffix(body, "FFFFF"), 0);
});

test("the offer email states the charge before the button and carries an unsubscribe link", () => {
  const email = renderLifecycleEmail({
    type: "pro_month_offer",
    userId: "00000000-0000-0000-0000-000000000001",
    recipient: "kaiako@example.nz",
    name: "Aroha Smith",
    context: { claimBy: "Thursday 8 October", firstChargeIfToday: "Saturday 24 October", proPrice: { NZD: 33, AUD: 29 }, educatorPrice: { NZD: 21, AUD: 19 } },
  });
  assert.equal(email.marketing, true);
  assert.equal(email.subject, "Aroha, a month of StoryLoop Pro, on us");
  assert.match(email.ctaUrl, /\/offer\/pro-month\?utm_source=storyloop_email/);
  const terms = email.html.indexOf("How the free month works");
  const button = email.html.indexOf("Start my free month");
  assert.ok(terms > 0 && button > terms, "terms come before the button");
  assert.match(email.html, /NZ\$33 or A\$29 a month/);
  assert.match(email.html, /Saturday 24 October/);
  assert.match(email.html, /Unsubscribe from offers and tips/);
  assert.match(email.html, /note-to-story\.gif/);
  assert.match(email.text, /Claim by Thursday 8 October/);
  assert.doesNotMatch(email.html, /—/, "no em dashes");
});

test("offer dates read naturally, without the en-NZ comma", async () => {
  const { longDay } = await import("../lib/offers");
  assert.equal(longDay(new Date("2026-10-07T03:00:00Z")), "Wednesday 7 October");
});

test("the free-month email never goes to an address that cannot receive it", async () => {
  const { isUndeliverableEmail } = await import("../lib/offers");
  for (const bad of ["qa+1@storyloop.test", "x@example.invalid", "a@example.com", "story@storyloop.qa", "shellh2017@gnail.com", "t@test.local", "nodomain@", "no-dot@localhost"]) {
    assert.equal(isUndeliverableEmail(bad), true, bad);
  }
  for (const good of ["educator@gmail.com", "erica@thepark-elc.co.nz", "shannon@education.wa.edu.au", "isla@ais.com.sg", "a@yahoo.co.nz", "person@mail.com"]) {
    assert.equal(isUndeliverableEmail(good), false, good);
  }
});
