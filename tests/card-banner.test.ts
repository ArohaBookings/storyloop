import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CARD_FIX_HREF, cardBannerCopy, cardBannerHiddenOn, cardBannerStatus } from "../lib/card-banner";
import { sanitizeEventMetadata } from "../lib/analytics/events";

// Proposal M (18 Nov 2026): a payer whose card failed sees one calm banner in
// the app with one tap to fix the card on Billing.

test("only the person whose own card failed sees it", () => {
  assert.equal(cardBannerStatus({ plan: "educator", subscription_status: "past_due" }), "past_due");
  assert.equal(cardBannerStatus({ plan: "centre_starter", subscription_status: "past_due" }), "past_due", "a centre owner pays the centre's card");
  assert.equal(cardBannerStatus({ plan: "educator", subscription_status: "payment_required" }), "unpaid");
  for (const status of ["active", "trialing", "admin_override", "cancelled", null, undefined, ""]) {
    assert.equal(cardBannerStatus({ plan: "educator", subscription_status: status }), null, String(status));
  }
  assert.equal(cardBannerStatus({ plan: "free", subscription_status: "past_due" }), null, "a free account has no card to fix");
  assert.equal(
    cardBannerStatus({ plan: "centre_starter", subscription_status: "past_due", plan_via_centre: { centreId: "c", centreName: "Kowhai" } }),
    null,
    "an educator covered by her centre: her leader pays",
  );
  assert.equal(cardBannerStatus(null), null);
});

test("calm words, one button to Billing, and nothing about pausing or cancelling", () => {
  for (const status of ["past_due", "unpaid"] as const) {
    const copy = cardBannerCopy(status);
    const words = `${copy.line} ${copy.button}`;
    assert.doesNotMatch(words, /pause|cancel/i, "pause and cancel live on Billing only");
    assert.doesNotMatch(words, /[—–!]|urgent|immediately|suspend/i, "calm, no dashes");
    assert.ok(copy.line.length < 120, "one short line");
  }
  assert.equal(CARD_FIX_HREF, "/billing?fix=card");
});

test("not on Billing or the dashboard, which carry their own notice", () => {
  assert.equal(cardBannerHiddenOn("/billing"), true);
  assert.equal(cardBannerHiddenOn("/billing/receipt/in_1"), true);
  assert.equal(cardBannerHiddenOn("/dashboard"), true);
  assert.equal(cardBannerHiddenOn("/generate"), false);
  assert.equal(cardBannerHiddenOn("/billingx"), false);
  assert.equal(cardBannerHiddenOn(null), false);
});

test("its events carry the status only", () => {
  assert.deepEqual(sanitizeEventMetadata("card_banner_shown", { status: "past_due", email: "a@b.nz" }), { status: "past_due" });
  assert.deepEqual(sanitizeEventMetadata("card_banner_tap", { status: "unpaid" }), { status: "unpaid" });
});

test("the app layout shows it and Billing opens the card page from it", () => {
  const layout = readFileSync("app/(app)/layout.tsx", "utf8");
  assert.match(layout, /cardBannerStatus\(profile\)/);
  assert.match(layout, /<CardFailedBanner status=\{cardStatus\} \/>/);
  const billing = readFileSync("app/(app)/billing/page.tsx", "utf8");
  assert.match(billing, /searchParams\.get\("fix"\) === "card"/);
  assert.match(billing, /isBillingBlocked\(profile\) && !isBillingPastDue\(profile\)\) return;/, "only for a failed card");
});
