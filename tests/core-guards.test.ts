import assert from "node:assert/strict";
import test from "node:test";
import {
  billingStatusLabel,
  isBillingBlocked,
  isBillingPastDue,
} from "../lib/billing-access";
import { sanitiseShortText, sanitiseStringList } from "../lib/children";
import { safeRedirectPath } from "../lib/safe-redirect";
import { buildExportPacks } from "../lib/export-packs";
import { buildPlanningBoard } from "../lib/planning-board";
import { hasFeatureAccess, normalizePlanKey } from "../lib/plans";
import { runPrivacyGuardian } from "../lib/privacy-guardian";
import { buildUserMessage } from "../lib/ai/prompts";
import {
  enforceFrameworkForResult,
  type FrameworkGuardStoryResult,
  getMinimumStoryWords,
  getUnsupportedStoryDetails,
  humaniseQualityNote,
} from "../lib/ai/quality-guards";
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

test("new plan ladder normalises legacy centre and gates advanced features", () => {
  assert.equal(normalizePlanKey("centre"), "centre_starter");
  assert.equal(hasFeatureAccess("free", "privacyEvidenceGuardian"), true);
  assert.equal(hasFeatureAccess("educator", "exportPacks"), true);
  assert.equal(hasFeatureAccess("educator", "familyReplyLoop"), false);
  assert.equal(hasFeatureAccess("educator_pro", "familyReplyLoop"), true);
  assert.equal(hasFeatureAccess("centre_starter", "planningBoard"), true);
  assert.equal(hasFeatureAccess("centre_starter", "directorRoiDashboard"), false);
  assert.equal(hasFeatureAccess("centre_growth", "directorRoiDashboard"), true);
});

test("export packs use framework-specific family wording", () => {
  const au = buildExportPacks({
    framework: "AU",
    childName: "Lily",
    story: "Lily tried again.",
    familyQuestion: "What does Lily build at home?",
  }).find((pack) => pack.platform === "storypark");

  const nz = buildExportPacks({
    framework: "NZ",
    childName: "Lily",
    story: "Lily tried again.",
    familyQuestion: "What does Lily build at home?",
  }).find((pack) => pack.platform === "storypark");

  assert.ok(au?.text.includes("Question for family\n"));
  assert.equal(au?.text.includes("family/whānau"), false);
  assert.ok(nz?.text.includes("Question for family/whānau"));
});

test("privacy guardian flags sensitive and unsupported wording", () => {
  const result = runPrivacyGuardian({
    observation: "A child built a tower.",
    story: "This proves that the child has anxiety and will always avoid group play.",
  });

  assert.equal(result.status, "high");
  assert.equal(result.checks.noDiagnosisLanguage, false);
  assert.equal(result.checks.noUnsupportedClaims, false);
});

test("planning board highlights open responses and documentation gaps", () => {
  const board = buildPlanningBoard([
    {
      id: "story-1",
      child_id: "child-1",
      child_name: "Ari",
      next_steps: ["Offer more blocks"],
      metadata: { familyQuestion: "What does Ari build at home?" },
      created_at: "2026-06-01T00:00:00.000Z",
    },
  ], [
    { id: "child-1", name: "Ari", age_group: "3 years", interests: ["blocks"] },
    { id: "child-2", name: "Mia", age_group: "4 years", interests: [] },
  ]);

  assert.equal(board.openResponses.length, 1);
  assert.equal(board.familyReplyGaps.length, 1);
  assert.equal(board.unreviewedStories.length, 1);
  assert.equal(board.documentationRadar.find((item) => item.childName === "Mia")?.signal, "Needs a fresh observation");
});

test("EYLF prompt explicitly disables Te Reo and Kōwhiti guidance", () => {
  const prompt = buildUserMessage(
    "Lily built a tower and said it stayed.",
    "3 years",
    "Lily",
    "natural",
    "AU",
    mergeStoryPreferences({
      includeTeReoLevel: "high",
      includeKowhitiWhakapae: true,
    })
  );

  assert.ok(prompt.includes("not used in EYLF mode"));
  assert.ok(prompt.includes("Australian EYLF mode. Do not include Kōwhiti Whakapae references."));
  assert.ok(prompt.includes("Do not use te reo Māori terms or Aotearoa-only framework language."));
});

test("story quality helpers enforce paid-grade depth and readable notes", () => {
  assert.ok(getMinimumStoryWords("balanced") > getMinimumStoryWords("concise"));
  assert.ok(getMinimumStoryWords("detailed") > getMinimumStoryWords("balanced"));
  assert.equal(
    humaniseQualityNote("childVoiceSupported"),
    "Child voice is only used when the observation supports it."
  );
  assert.equal(humaniseQualityNote("notAISounding"), "The draft does not read like generic AI copy.");
});

test("EYLF result guard removes Aotearoa-only framework leakage", () => {
  const leaky: FrameworkGuardStoryResult = {
    storyTitle: "Ruby's Shopping Play",
    story:
      "Ruby pretended to shop. This links with Mana aotūroa | Exploration and supports whānau noticing.",
    outcomes: ["Mana aotūroa | Exploration", "Mana reo | Communication"],
    curriculumLinks: ["This links with Te Whāriki because Ruby explored a pretend role."],
    learningSummary: "Ruby used pretend play to explore a familiar role with whānau language.",
    childVoice: "",
    learningDispositions: ["curiosity"],
    socialEmotionalLinks: [],
    culturalConnections: ["whānau connection"],
    whanauConnection: "Whānau may notice similar play at home.",
    assumptions: [],
    evidenceAnchors: ["Ruby pretended to shop."],
    educatorChecks: [],
    pedagogyLinks: ["responsive and reciprocal practice"],
    frameworkEvidence: ["This links with Te Whāriki because the play involved exploration."],
    familyQuestion: "What pretend shopping play do whānau notice at home?",
    followUpPrompt: "Notice the language Ruby uses next time.",
    childAge: "Not stated",
    nextSteps: ["Offer pretend-shop materials."],
    wordCount: 12,
  };

  const cleaned = enforceFrameworkForResult(leaky, "AU");
  const joined = [
    cleaned.story,
    ...cleaned.outcomes,
    ...cleaned.curriculumLinks,
    cleaned.learningSummary,
    ...cleaned.culturalConnections,
    cleaned.whanauConnection,
    ...cleaned.frameworkEvidence,
    cleaned.familyQuestion,
  ].join(" ");

  assert.equal(/Te Whāriki|Mana aotūroa|Mana reo|whānau/i.test(joined), false);
  assert.ok(cleaned.outcomes.every((item) => item.includes("EYLF Outcome")));
  assert.ok(cleaned.educatorChecks.some((item) => item.includes("EYLF links")));
});

test("sparse notes reject invented quotes, materials, and peer details", () => {
  const result: FrameworkGuardStoryResult = {
    story: "Ruby used toy food and a cash register. She asked her peer, \"Can I have two apples, please?\"",
    outcomes: ["EYLF Outcome 4"],
    curriculumLinks: ["Ruby used shopping play to explore roles."],
    learningSummary: "Ruby counted money and spoke with another child.",
    childVoice: "Can I have two apples, please?",
    learningDispositions: ["communication"],
    socialEmotionalLinks: [],
    culturalConnections: [],
    whanauConnection: "Families may notice shopping play.",
    assumptions: [],
    evidenceAnchors: ["Ruby played shop."],
    educatorChecks: [],
    pedagogyLinks: ["play-based learning"],
    frameworkEvidence: ["The play links with EYLF."],
    familyQuestion: "What shopping play happens at home?",
    followUpPrompt: "Notice what Ruby says next.",
    nextSteps: ["Offer shop props."],
    wordCount: 16,
  };

  const issues = getUnsupportedStoryDetails(result, "Ruby played shop. Ruby went shopping.");
  assert.ok(issues.some((issue) => issue.includes("cash register")));
  assert.ok(issues.some((issue) => issue.includes("Unsupported child quote")));
  assert.ok(issues.some((issue) => issue.includes("peer")));
});
