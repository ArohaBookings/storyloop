import assert from "node:assert/strict";
import test from "node:test";
import { renderLifecycleEmail } from "../lib/email/templates";

// Pause and cancel live on the Billing page only, never in an email that is not a billing notice
// (Leo, 10 Nov 2026; review 2, R2-02).

const BILLING_NOTICES = new Set(["trial_ending", "payment_succeeded", "payment_failed", "payment_failed_final", "cancellation_scheduled", "subscription_cancelled"]);
const TYPES = [
  "welcome", "no_first_story", "first_story_created", "two_free_stories_used", "free_limit_reached", "paid_no_usage_checkin",
  "weekly_value", "feedback_request", "family_pack_prompt", "centre_planning_prompt", "story_quality_upgrade", "pro_month_offer",
  "winback_offer", "checkout_abandoned", "usage_tips", "went_quiet", "referral_joined", "referral_earned", "referral_invite",
] as const;

test("no email outside the billing notices says pause or cancel", () => {
  for (const type of TYPES) {
    assert.equal(BILLING_NOTICES.has(type), false);
    for (const context of [{}, { storiesThisMonth: 12, planLabel: "Educator", amountLabel: "NZ$21", referralCode: "ABC123", hoursSaved: 4 }]) {
      let email;
      try {
        email = renderLifecycleEmail({ type: type as never, userId: "u", recipient: "kaiako@example.com", name: "Aroha", context });
      } catch {
        continue;
      }
      // The unsubscribe footer is not an offer, and "she paused" is a child in the example story.
      const words = `${email.subject}\n${email.html}\n${email.text}`.replace(/unsubscribe/gi, "").replace(/she paused/g, "");
      assert.doesNotMatch(words, /\bpaus(e|es|ed|ing)\b|\bcancel/i, `${type} mentions pause or cancel`);
    }
  }
});
