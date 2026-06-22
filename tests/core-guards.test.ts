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
import { hasPhysicalSafetyIncident } from "../lib/safety-incident";
import { getStoryClarification } from "../lib/story-clarification";
import { buildEvidenceLedStory, shouldUseEvidenceLedStory } from "../lib/ai/evidence-story";
import { buildPhysicalSafetyFallbackStory } from "../lib/ai/physical-safety-story";
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

test("privacy guardian flags physical safety and conflict observations", () => {
  const result = runPrivacyGuardian({
    observation: "Jax pushed Ruby and Ruby punched Jax.",
    story: "Ruby needed support with safe bodies and repair.",
  });

  assert.equal(hasPhysicalSafetyIncident("Jax pushed Ruby and Ruby punched Jax."), true);
  assert.equal(result.status, "review");
  assert.equal(result.checks.noPhysicalSafetyIncident, false);
  assert.ok(result.issues.some((item) => item.id === "physical-safety-incident"));
});

test("physical safety detector ignores ordinary infant movement", () => {
  const observation = "Maya reached for the yellow scarf. She waved it slowly. Maya laughed, kicked her legs, and reached for the scarf again.";

  assert.equal(hasPhysicalSafetyIncident(observation), false);
  assert.equal(hasPhysicalSafetyIncident("Ruby kicked Jax during play."), true);
  assert.equal(hasPhysicalSafetyIncident("Jax hit Ruby and Ruby cried."), true);
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
  assert.equal(humaniseQualityNote("noMetaCommentary"), "The story avoids draft-review commentary.");
});

test("clarification asks valid questions before unsafe or vague notes become stories", () => {
  const unsafe = getStoryClarification({
    observations: "Jax pushed Ruby and Ruby hit Jax which was unacceptable.",
    childName: "Ruby",
  });
  assert.equal(unsafe.needsClarification, true);
  assert.equal(unsafe.kind, "safety_review");
  assert.ok(unsafe.questions.length > 0 && unsafe.questions.length <= 3);
  assert.ok(unsafe.questions.some((question) => /pretend play|real incident/i.test(question)));

  const vague = getStoryClarification({
    observations: "Ruby played and had fun.",
    childName: "Ruby",
  });
  assert.equal(vague.needsClarification, true);
  assert.equal(vague.kind, "thin_observation");
  assert.ok(vague.questions.length > 0 && vague.questions.length <= 3);
  assert.ok(vague.questions.join(" ").includes("Ruby"));
  assert.ok(/did|where|materials|learning|focus|support/i.test(vague.questions.join(" ")));

  const ready = getStoryClarification({
    observations: "Maya lay on the mat and watched the scarf move above her. She smiled when I paused, then kicked her legs until I moved it again.",
    childName: "Maya",
  });
  assert.equal(ready.needsClarification, false);
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

test("physical conflict observations use incident-aware story path", () => {
  const observations = [
      "Jax and ruby played together and had fun",
      "Jax pushed ruby and ruby didnt like it",
      "ruby punched Jax which was unacceptable",
    ].join("\n");
  const result = buildPhysicalSafetyFallbackStory({}, {
    observations,
    childName: "Ruby",
    ageGroup: "3-4 years",
    framework: "NZ",
    depth: "detailed",
    tone: "warm",
  }, [], 0);
  const guardian = runPrivacyGuardian({ observation: observations, story: result.story });

  assert.equal(result.storyTitle, "Supporting Ruby's Safe Play");
  assert.ok(result.story.includes("social learning and safety moment"));
  assert.ok(result.story.includes("The physical response was not safe"));
  assert.ok(result.story.includes("Learning Story"));
  assert.ok(result.story.includes("Where to next / Responding"));
  assert.equal(/Playtime Adventure|cash register|toy food|follow the interest/i.test(result.story), false);
  assert.equal(/the educator should|the educator's role|this draft|the interpretation is grounded/i.test(result.story), false);
  assert.ok(result.wordCount >= getMinimumStoryWords("detailed"));
  assert.ok(result.outcomes.some((item) => item.includes("Mana atua | Wellbeing")));
  assert.equal(result.outcomes.some((item) => /Mana aotūroa|Exploration/i.test(item)), false);
  assert.equal(guardian.status, "review");
  assert.equal(result.storyQuality?.revisionCount, 0);
});

test("evidence-led stories turn thin block notes into child-centred educator documentation", () => {
  const observations = "Lily built a tower with wooden blocks. It fell over twice. Lily looked at it, tried again, then asked Mia to help hold the side. Lily smiled and said it is standing.";
  const result = buildEvidenceLedStory({}, {
    observations,
    childName: "Lily",
    ageGroup: "3-4 years",
    framework: "NZ",
    depth: "detailed",
    tone: "warm",
    pedagogyFocus: "balanced",
  });

  assert.equal(shouldUseEvidenceLedStory(observations), true);
  assert.equal(result.storyTitle, "Lily's Tower That Stood");
  assert.ok(result.story.includes("Learning Story"));
  assert.ok(result.story.includes("What learning we noticed"));
  assert.ok(result.story.includes("We noticed Lily staying with a real problem"));
  assert.ok(result.story.includes("asked Mia to help hold the side"));
  assert.equal(result.story.includes("meaningful in the moment"), false);
  assert.equal(result.story.includes("Learning Through Play"), false);
  assert.equal(/the educator should|the educator's role|this draft|the interpretation is grounded|curriculum wording supports/i.test(result.story), false);
  assert.equal(result.childVoice, 'Lily said, "it is standing".');
  assert.ok(result.wordCount >= getMinimumStoryWords("detailed"));
  assert.ok(result.outcomes.some((item) => item.includes("Mana tangata | Contribution")));
  assert.ok(result.outcomes.some((item) => item.includes("Mana reo | Communication")));
});

test("evidence-led EYLF pretend play stays Australian and does not become a generic tower story", () => {
  const observations = "Ruby pretended to go shopping. She put cups and blocks into a basket, walked to the table, made beeping sounds, and gave the basket to Amir.";
  const result = buildEvidenceLedStory({}, {
    observations,
    childName: "Ruby",
    ageGroup: "3-4 years",
    framework: "AU",
    depth: "balanced",
    tone: "warm",
    pedagogyFocus: "child_voice",
  });
  const joined = [
    result.story,
    ...result.outcomes,
    ...result.curriculumLinks,
    result.whanauConnection,
    result.familyQuestion,
  ].join(" ");

  assert.equal(result.storyTitle, "Ruby's Pretend Play Story");
  assert.ok(result.story.includes("Learning Story"));
  assert.ok(result.story.includes("What learning we noticed"));
  assert.ok(result.story.includes("pretend play"));
  assert.ok(result.story.includes("objects as symbols"));
  assert.equal(/Tower That Stood|meaningful in the moment|cashier/i.test(joined), false);
  assert.ok(result.outcomes.every((item) => item.includes("EYLF Outcome")));
  assert.equal(/\b(Te Whāriki|Mana atua|Mana tangata|Mana reo|whānau|kaiako|tamariki|Aotearoa)\b/i.test(joined), false);
  assert.ok(result.wordCount >= getMinimumStoryWords("balanced"));
});

test("EYLF physical conflict stories stay Australian and avoid Te Reo", () => {
  const result = buildPhysicalSafetyFallbackStory({}, {
    observations: "Jax pushed Ruby. Ruby hit Jax. The educator supported safe bodies.",
    childName: "Ruby",
    framework: "AU",
    depth: "balanced",
    tone: "professional",
  });
  const joined = [
    result.story,
    ...result.outcomes,
    ...result.curriculumLinks,
    result.whanauConnection,
    result.familyQuestion,
  ].join(" ");

  assert.ok(result.outcomes.every((item) => item.includes("EYLF Outcome")));
  assert.equal(/\b(Te Whāriki|Mana atua|Mana tangata|Mana reo|whānau|kaiako|tamariki|Aotearoa)\b/i.test(joined), false);
  assert.ok(result.story.includes("social learning and safety moment"));
});

test("educator names shape story voice without replacing evidence", () => {
  const result = buildEvidenceLedStory({}, {
    observations: "Ari poured water between two cups. He slowed down when it spilled and said more water gone.",
    childName: "Ari",
    framework: "AU",
    depth: "balanced",
    tone: "natural",
    educatorNames: ["Sarah", "Moana"],
  });

  assert.ok(result.story.includes("Sarah and Moana noticed Ari"));
  assert.ok(result.story.includes("Sarah and Moana can continue"));
  assert.equal(/this draft|the educator should|the educator's role/i.test(result.story), false);
});
