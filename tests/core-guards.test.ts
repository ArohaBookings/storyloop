import assert from "node:assert/strict";
import test from "node:test";
import {
  billingStatusLabel,
  isBillingBlocked,
  isBillingPastDue,
} from "../lib/billing-access";
import { sanitiseShortText, sanitiseStringList } from "../lib/children";
import { safeRedirectPath } from "../lib/safe-redirect";
import {
  mergeStoryPreferences,
  normalizeFramework,
  sanitizeStoryPreferences,
} from "../lib/story-options";

test("safe redirects stay on StoryLoop", () => {
  assert.equal(safeRedirectPath("/insights?child=123"), "/insights?child=123");
  assert.equal(safeRedirectPath("https://evil.example"), "/dashboard");
  assert.equal(safeRedirectPath("//evil.example"), "/dashboard");
  assert.equal(safeRedirectPath("/\\evil.example"), "/dashboard");
});

test("child profile fields are bounded and deduplicated", () => {
  assert.equal(sanitiseShortText("  learner  ", 20), "learner");
  assert.deepEqual(
    sanitiseStringList("blocks, water, blocks, , dramatic play", 3),
    ["blocks", "water"]
  );
});

test("billing states preserve grace access and block failed subscriptions", () => {
  assert.equal(isBillingPastDue({ plan: "educator", subscription_status: "past_due" }), true);
  assert.equal(isBillingBlocked({ plan: "educator", subscription_status: "past_due" }), false);
  assert.equal(isBillingBlocked({ plan: "educator", subscription_status: "payment_required" }), true);
  assert.equal(isBillingBlocked({ plan: "free", subscription_status: "payment_required" }), false);
  assert.equal(billingStatusLabel("trialing"), "Trial active");
});

test("story preferences normalise and merge without dropping saved choices", () => {
  const saved = sanitizeStoryPreferences({
    defaultFramework: "NZ",
    preferredTone: "warm",
    emphasis: ["child voice", "child voice"],
    includeTapasa: true,
  });
  const merged = mergeStoryPreferences(saved, { depthPreference: "detailed" });

  assert.equal(normalizeFramework("unexpected"), "AU");
  assert.equal(merged.defaultFramework, "NZ");
  assert.equal(merged.preferredTone, "warm");
  assert.equal(merged.depthPreference, "detailed");
  assert.deepEqual(merged.emphasis, ["child voice"]);
  assert.equal(merged.includeTapasa, true);
});
