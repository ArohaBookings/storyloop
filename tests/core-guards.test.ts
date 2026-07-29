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
import { renderLifecycleEmail } from "../lib/email/templates";
import { calculateArr, calculateMrr, isActiveRevenue, isPayingCustomer, isRevenueAccount } from "../lib/revenue";
import { hasPhysicalSafetyIncident } from "../lib/safety-incident";
import { getStoryClarification } from "../lib/story-clarification";
import { inferPrimaryChildName, extractOtherChildNames } from "../lib/story-context";
import { buildEvidenceLedStory, shouldUseEvidenceLedStory } from "../lib/ai/evidence-story";
import { buildPhysicalSafetyFallbackStory } from "../lib/ai/physical-safety-story";
import { buildUserMessage, LEARNING_STORY_PROMPT } from "../lib/ai/prompts";
import {
  enforceFrameworkForResult,
  type FrameworkGuardStoryResult,
  childQuotePreserved,
  getMetaCommentaryIssues,
  getMinimumStoryWords,
  getReadabilityFlags,
  getToneTells,
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

test("primary child name is inferred from observation notes when the field is empty", () => {
  assert.equal(
    inferPrimaryChildName('Ruby (3) and Sam played shopkeepers. Ruby said "your turn now". Sarah stayed nearby.'),
    "Ruby"
  );
  assert.equal(
    inferPrimaryChildName("Sarah noticed Ari pour water between two cups and slow down when it spilled."),
    "Ari"
  );
  // Sentence-initial words like "It"/"She" must not be mistaken for the child's name.
  assert.equal(
    inferPrimaryChildName(
      'Today Lily spent time building a tower with wooden blocks. It fell twice, and she paused each time before trying again. She asked another child to hold the base steady, then smiled and said, "It stayed!" when the tower stood up.'
    ),
    "Lily"
  );
  // No real name present (only pronouns) should infer nothing rather than a pronoun.
  assert.equal(inferPrimaryChildName("She built a tower. It fell. She tried again."), "");
  // Generic child descriptors are not names.
  assert.equal(inferPrimaryChildName("Baby reached for the scarf and laughed when it moved."), "");
});

test("evidence-led detailed depth reaches the detailed word target", () => {
  const result = buildEvidenceLedStory({}, {
    observations: "Mia built a block tower. It fell. She tried again with a wider base.",
    childName: "Mia",
    framework: "AU",
    depth: "detailed",
    tone: "natural",
  });
  assert.ok(
    result.wordCount >= getMinimumStoryWords("detailed"),
    `expected >= ${getMinimumStoryWords("detailed")} words, got ${result.wordCount}`
  );
});

test("other-child detection ignores capitalised sentence-starters", () => {
  // "After" and "Suddenly" are sentence-starters, not children's names.
  assert.deepEqual(
    extractOtherChildNames("After lunch Max painted at the easel. Suddenly the paint dripped.", "Max"),
    []
  );
  // A genuine peer named mid-sentence is detected, and the focus child is excluded.
  assert.deepEqual(
    extractOtherChildNames("Max built a tower and asked Mia to help hold the base.", "Max"),
    ["Mia"]
  );
});

test("clarification gate fires only on genuinely thin or unsafe notes", () => {
  const gated = (note: string) => getStoryClarification({ observations: note, childName: null }).needsClarification;
  // Too thin / junk / vague / unsafe-without-educator-response -> ask for more.
  assert.equal(gated("test test test"), true);
  assert.equal(gated("kids played outside and had fun today"), true);
  assert.equal(gated("Jack pushed Leo and Leo cried"), true);
  // Decent real observations should generate straight away (no friction).
  assert.equal(
    gated("Maya and Sam played shopkeepers, taking turns. Maya used pretend money and said that will be five dollars please."),
    false
  );
  assert.equal(gated("Mia stacked the cups into a tower and knocked them down, then did it again."), false);
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
  assert.ok(/did|where|materials|respond|support|extend/i.test(vague.questions.join(" ")));
  assert.equal(/learning or response do you want/i.test(vague.questions.join(" ")), false);

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

test("invented multi-word child quotes are rejected; interpretive vocabulary is trusted", () => {
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
  // The fabricated multi-word child quote is the reliable signal — flag it.
  assert.ok(issues.some((issue) => issue.includes("Unsupported child quote")));
  // Interpretive vocabulary on a short note ("cash register", "peer") is now
  // trusted to the frontier writer rather than rejected into a generic template.
  assert.equal(issues.some((issue) => /cash register|peer/.test(issue)), false);
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
  }, [], 0);
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

// Regression cases from the 2026-07 production audit: every 83-scored story
// that week was a guard false positive, not a bad draft.
function guardResult(story: string): FrameworkGuardStoryResult {
  return {
    story,
    outcomes: ["Mana aotūroa | Exploration"],
    curriculumLinks: ["Links to exploration."],
    learningSummary: "Summary.",
    childVoice: "",
    learningDispositions: [],
    socialEmotionalLinks: [],
    culturalConnections: [],
    whanauConnection: "",
    assumptions: [],
    evidenceAnchors: ["anchor"],
    educatorChecks: [],
    pedagogyLinks: [],
    frameworkEvidence: ["fits"],
    familyQuestion: "",
    followUpPrompt: "",
    nextSteps: ["step"],
    wordCount: 40,
  };
}

test("a supplied quote survives spelling and punctuation cleanup", () => {
  const observations =
    "She approaches Nanny Marce and shows me the jersey. \"hmmm, whos jersey is that? Its not mine, its not Mia Maes and its not yours\".";
  const story =
    "Nanny Marce wondered with her, “Hmm, whose jersey is that? It’s not mine, it’s not Mia Mae’s and it’s not yours.” Together they looked around the room.";
  assert.deepEqual(getUnsupportedStoryDetails(guardResult(story), observations), []);
});

test("suggested and interpretive language is not treated as a fabricated quote", () => {
  const observations = "Ngaio shared the playdough with the other tamariki when they arrived at the table.";
  const story = [
    "We can support her fair sharing by noticing and naming the specific action: “You saw more tamariki coming and made sure everyone had some playdough.”",
    "These were small but clear ways of saying, “I am here, I feel safe enough to join in, and I am interested in what is happening.”",
    "We can support her by asking simple prompts such as, “How do you know it is fair?” and “What could you change next time?”",
  ].join(" ");
  assert.deepEqual(getUnsupportedStoryDetails(guardResult(story), observations), []);
});

test("an invented reported quote is still rejected", () => {
  const observations = "Maya and Sam played outside in the rain, jumping in puddles.";
  const story =
    "Maya turned to Sam and said, “Let us build a giant rainbow dam across the whole playground today.” They kept playing.";
  const issues = getUnsupportedStoryDetails(guardResult(story), observations);
  assert.ok(issues.some((issue) => issue.includes("Unsupported child quote")));
});

test("adult conduct in the note raises a high-severity guardian flag", () => {
  const guardian = runPrivacyGuardian({
    observation:
      "Maya pushed Sam into a puddle and he fell over. so then I kicked mayas ass because this is not acceptable behavior",
    story: "Today Maya and Sam played outside in the rain.",
  });
  assert.equal(guardian.status, "high");
  assert.ok(guardian.issues.some((item) => item.id === "adult-conduct"));
});

test("ordinary educator actions do not trigger the adult-conduct flag", () => {
  for (const observation of [
    "I kicked the ball back to Maya and she laughed.",
    "We hit the road for our neighbourhood walk after morning tea.",
    "Maya kicked her legs with excitement during waiata.",
    "I dragged the mat over so Sam could join the circle.",
  ]) {
    const guardian = runPrivacyGuardian({ observation, story: "" });
    assert.equal(
      guardian.issues.some((item) => item.id === "adult-conduct"),
      false,
      `false positive on: ${observation}`
    );
  }
});

test("a child quote normalised by the model still counts as supported", () => {
  const observations =
    "When it overflowed she laughed and said \"its to much watta, we needs a bigga bucket\". She dragged the big bucket over by herself.";
  const story =
    "When the bucket overflowed, Ariana laughed and said, “It's too much water, we need a bigger bucket.” She dragged the big bucket over by herself.";
  assert.deepEqual(getUnsupportedStoryDetails(guardResult(story), observations), []);
});

test("'bit' as a common phrase does not misfire the safety-incident detector", () => {
  // Benign uses of "bit" must not be read as biting (these gated real stories).
  for (const benign of [
    "Leo stirred the mud soup with a bit of water and said it was nearly ready.",
    "Ana arrived a bit upset this morning but settled after a cuddle.",
    "Sam needed a little bit of help to reach the top shelf.",
    "We spent a bit of time exploring the garden.",
  ]) {
    assert.equal(hasPhysicalSafetyIncident(benign), false, `false positive on: ${benign}`);
  }
  // Genuine biting incidents must still be caught.
  assert.equal(hasPhysicalSafetyIncident("Sam bit another child at kai time."), true);
  assert.equal(hasPhysicalSafetyIncident("Mia bit her friend on the arm."), true);
  assert.equal(hasPhysicalSafetyIncident("There was biting at lunch today."), true);
  assert.equal(hasPhysicalSafetyIncident("He bites when he is frustrated."), true);
});

// Revenue accounting. An internal/comp account on a paid plan must never reach
// MRR, ARR, or the paid counts, or every number on the dashboard is a lie.
test("internal and comp accounts are excluded from all revenue maths", () => {
  const PRICES = { free: 0, educator: 19, educator_pro: 29, centre_starter: 99, centre_growth: 199 } as const;
  const accounts = [
    { plan: "educator", subscription_status: "active", is_internal: false },        // real, counts
    { plan: "educator", subscription_status: "trialing", is_internal: false },      // real trial, counts
    { plan: "centre_growth", subscription_status: "admin_override", is_internal: true },  // founder, must NOT count
    { plan: "centre_growth", subscription_status: "admin_override", is_internal: false }, // comp w/o flag, must NOT count
    { plan: "educator", subscription_status: "cancelled", is_internal: false },     // churned, no revenue
    { plan: "free", subscription_status: "free", is_internal: false },              // free, no revenue
  ];

  assert.equal(calculateMrr(accounts, PRICES), 38, "only the two real educators contribute");
  assert.equal(calculateArr(accounts, PRICES), 38 * 12);
  // "Paying customer" is plan-based, so a just-cancelled educator still counts
  // here (they remain a customer until the period ends, and must stay visible
  // in billing-risk views). Revenue is status-based and excludes them.
  assert.equal(accounts.filter(isPayingCustomer).length, 3);
  assert.equal(accounts.filter(isActiveRevenue).length, 2, "cancelled generates no revenue");

  // The founder's own account, on the most expensive plan, adds nothing.
  const founder = { plan: "centre_growth", subscription_status: "admin_override", is_internal: true };
  assert.equal(isRevenueAccount(founder), false);
  assert.equal(isPayingCustomer(founder), false);
  assert.equal(isActiveRevenue(founder), false);
  assert.equal(calculateMrr([founder], PRICES), 0);

  // Belt and braces: admin_override never counts even if is_internal is missed.
  assert.equal(calculateMrr([{ plan: "centre_growth", subscription_status: "admin_override" }], PRICES), 0);
});

// Marketing email frequency. An educator getting several sales emails in a week
// unsubscribes, and then we cannot reach them even for billing.
test("every marketing template is covered by the weekly frequency cap", () => {
  const MARKETING_TYPES = [
    "no_first_story", "weekly_value", "feedback_request", "family_pack_prompt",
    "centre_planning_prompt", "went_quiet", "winback_offer", "referral_invite",
    "two_free_stories_used", "free_limit_reached",
  ] as const;
  const TRANSACTIONAL_TYPES = [
    "welcome", "first_story_created", "paid_no_usage_checkin", "story_quality_upgrade",
    "trial_ending", "payment_succeeded", "payment_failed", "subscription_cancelled",
    "referral_earned",
  ] as const;

  for (const type of MARKETING_TYPES) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    assert.equal(email.marketing, true, `${type} must be flagged marketing so the cap applies`);
    assert.ok(email.html.includes("unsubscribe"), `${type} must carry an unsubscribe link`);
  }

  for (const type of TRANSACTIONAL_TYPES) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    assert.equal(email.marketing, false, `${type} is transactional and must not be capped or unsubscribable`);
  }
});

// Every string below is a real sentence pulled from a shipped story in the
// production database. 23% of stories referred to "the note" because the prompt
// literally instructed it to. These lock that door.
test("meta-commentary guard catches every real defect sentence from production", () => {
  const shipped = [
    "The note says that Sam pushed Josh, and Josh got mad.",
    "Because the note is brief, we are careful not to add extra details.",
    "The exact way Josh showed this needs to be checked before sharing.",
    "The note tells us James returned to the display and asked sensible questions.",
    "The note suggests she moved freely and confidently, with the people who matter to her close by.",
    "The note describes Shae and Ella greeting each other often, holding hands.",
    "The note does not tell us how long Mia worked on the bridge or what support was nearby.",
    "The notes do not give us one clear action from Lilah, so we have kept this story focused.",
    "In the note we have, he built a house to keep the shark in.",
    "The note also names Aunty and Sissy, so the educator can decide whether that name should remain.",
    "The main learning we can see from the note is the process of testing an idea.",
    "What we can say is that Tane's position shifted within one play session.",
    "From this brief note, the clearest learning is her growing confidence.",
    "The note is brief, so we have kept the interpretation close to what was seen.",
    "The observation does not tell us what happened next.",
  ];

  for (const sentence of shipped) {
    const issues = getMetaCommentaryIssues(sentence);
    assert.ok(issues.length > 0, `guard missed a real shipped defect: ${sentence}`);
  }
});

test("meta-commentary guard does not fire on clean educator writing", () => {
  const clean = [
    "Sam pushed Josh, and Josh got mad.",
    "Josh may have been telling us that he did not like what happened to his body.",
    "Keiller stacked the blocks as high as he could reach, placing them carefully.",
    "Tiana picks up a pan and places corn and a block inside it.",
    "She played the notes on the xylophone one after the other.",
    "We noticed Harry adjusting his legs until the swing kept moving.",
    "Erica noticed how carefully he balanced the blocks before choosing the moment.",
    "James used a three-word phrase to ask for help, then asked for another nail.",
    "We can share this story with whanau at pick-up time.",
    "Aria filled a bucket in the sandpit and tipped it out, around twenty times over.",
    "We will continue to notice how Alani shows belonging during centre events.",
    "Mia moved the wider blocks underneath and said, \"I need strong ones at the bottom.\"",
  ];

  for (const sentence of clean) {
    const issues = getMetaCommentaryIssues(sentence);
    assert.equal(issues.length, 0, `guard false-positived on clean writing: ${sentence} -> ${issues.join("; ")}`);
  }
});

test("the story prompt no longer instructs the model to say 'the note suggests'", () => {
  // The phrase itself still appears in the prompt's banned-phrase list, which is
  // correct. What must never come back is the instruction to USE it.
  assert.ok(
    !/Use careful phrasing such as/i.test(LEARNING_STORY_PROMPT),
    "prompt must not instruct the model to hedge by referring to the note"
  );
  assert.ok(
    /NEVER REFER TO THE NOTE/i.test(LEARNING_STORY_PROMPT),
    "prompt must carry the explicit ban"
  );
});

test("tone grading catches AI tells but not ordinary educator writing", () => {
  const bad = [
    "This was a beautiful moment for Harry.",
    "Mia demonstrated her understanding of balance.",
    "The story showcases holistic development.",
    "Ari spent time exploring the water table.",
    "Josh was engaged in meaningful play.",
    "It was remarkable to watch.",
  ];
  for (const s of bad) assert.ok(getToneTells(s).length > 0, `missed tone tell: ${s}`);

  const good = [
    "Harry kept adjusting his legs until the swing held its movement.",
    "Mia moved the wider blocks underneath and tried the car again.",
    "Ari pressed wet sand against the gap and watched what happened.",
    "Josh got mad when Sam pushed him.",
    "Keiller waited until his cousin had finished before knocking it down.",
  ];
  for (const s of good) assert.equal(getToneTells(s).length, 0, `false positive: ${s} -> ${getToneTells(s).join(";")}`);
});

test("readability splits sentences correctly around quoted speech", () => {
  // A period inside a closing quote still ends the sentence. Missing this made
  // stories that preserve a child's words look like they ran on.
  const quoted =
    'We can use simple words, such as, "You have some blocks, and Leo has some too." ' +
    'We can offer clear choices when more than one child wants the same thing. ' +
    'We will keep noticing how Tane responds when that happens.';
  assert.equal(getReadabilityFlags(quoted).length, 0, `false positive: ${getReadabilityFlags(quoted).join(";")}`);

  const runOn = `Harry ${"kept going and ".repeat(30)}stopped.`;
  assert.ok(getReadabilityFlags(runOn).length > 0, "should flag a genuine run-on sentence");
});

test("child quote preservation is graded only when the educator recorded one", () => {
  const obs = 'Kahu said "its to much watta" when it spilled.';
  assert.equal(childQuotePreserved('Kahu said, "its to much watta", then tipped some out.', obs), true);
  // Polishing the child's spelling loses the evidence.
  assert.equal(childQuotePreserved('Kahu said it was too much water.', obs), false);
  // No quote recorded means there is nothing to keep.
  assert.equal(childQuotePreserved("Harry swung.", "harry played on the swing"), null);
});
