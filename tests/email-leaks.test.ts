import assert from "node:assert/strict";
import test from "node:test";
import { CAP_EXEMPT_EMAIL_TYPES, NUDGE_EMAIL_TYPES, isHeldByFrequencyCap } from "../lib/email/send";
import { WEEKLY_VALUE_MIN_AGE_DAYS } from "../lib/email/automation";
import { renderLifecycleEmail } from "../lib/email/templates";
import { safeRedirectPath } from "../lib/safe-redirect";

// Prod, 15 Aug to 16 Oct 2026: the "one story left" and "out of free stories"
// emails were skipped 16 times because a weekly tip had gone out a few hours
// earlier. Two free educators used every free story and never heard a word.
test("the moments someone decides to pay are never held back by the weekly cap", () => {
  for (const type of ["two_free_stories_used", "free_limit_reached", "checkout_abandoned"] as const) {
    assert.equal(isHeldByFrequencyCap(type, true), false, `${type} must not be capped`);
  }
});

test("ordinary nudges are still capped, transactional mail never is", () => {
  for (const type of ["weekly_value", "feedback_request", "family_pack_prompt", "went_quiet", "referral_invite", "no_first_story"] as const) {
    assert.equal(isHeldByFrequencyCap(type, true), true, `${type} should stay under the cap`);
  }
  for (const type of ["payment_failed", "trial_ending", "welcome", "payment_succeeded"] as const) {
    assert.equal(isHeldByFrequencyCap(type, false), false, `${type} is transactional`);
  }
});

test("cap-exempt emails are still marketing: unsubscribe honoured, and they count toward the cap", () => {
  for (const type of CAP_EXEMPT_EMAIL_TYPES) {
    assert.ok(NUDGE_EMAIL_TYPES.includes(type), `${type} must still count toward the weekly cap for later nudges`);
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    assert.equal(email.marketing, true);
    assert.ok(email.html.includes("unsubscribe"), `${type} must carry an unsubscribe link`);
  }
});

test("no weekly tip in an account's first week", () => {
  assert.ok(WEEKLY_VALUE_MIN_AGE_DAYS >= 7);
});

// Email buttons go straight to the page with the offer; a signed-out reader is
// sent to sign in and brought back by the app (tests/login-redirect.test.ts).
test("upgrade email buttons land on billing with the offer and keep attribution", () => {
  for (const type of ["free_limit_reached", "two_free_stories_used"] as const) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    const cta = new URL(email.ctaUrl);
    assert.equal(cta.pathname, "/billing");
    assert.equal(cta.searchParams.get("offer"), "activation");
    assert.equal(cta.searchParams.get("utm_campaign"), type);
    assert.equal(safeRedirectPath(`${cta.pathname}${cta.search}`), `${cta.pathname}${cta.search}`, "a safe sign-in return target");
  }
});

test("public pages in emails are linked directly", () => {
  const email = renderLifecycleEmail({ type: "referral_invite", userId: "u", recipient: "a@b.com", name: "Sam", context: { referralCode: "ABC1234" } });
  assert.ok(!email.html.includes("/login?redirect="), "no sign-in wrapping on email links");
});

test("the one-story-left email does not repeat the offer wording", () => {
  const email = renderLifecycleEmail({ type: "two_free_stories_used", userId: "u", recipient: "a@b.com", name: "Sam" });
  assert.ok(!/first month is .*first month/i.test(email.text), email.text);
});
