import assert from "node:assert/strict";
import test from "node:test";
import {
  FRAMEWORK_LABELS,
  INTERNATIONAL_FRAMEWORKS,
  frameworkForCountry,
  frameworkLeaks,
  frameworkPromptValue,
  isInternationalFramework,
  normalizeAnyFramework,
} from "../lib/international-frameworks";
import { buildInternationalUserMessage, inspectInternationalStory } from "../lib/ai/international-story";
import { normaliseStoryResult } from "../lib/ai/generate";
import { normalizeFramework, sanitizeStoryPreferences } from "../lib/story-options";
import { buildCurriculumCompass } from "../lib/curriculum-compass";
import { buildExportPacks } from "../lib/export-packs";

test("AU and NZ resolve exactly as before for every input that is not UK or IE", () => {
  for (const value of ["AU", "NZ", "", "nz", "au", "Australia", "New Zealand", "US", "uk", "ie", null, undefined]) {
    assert.equal(normalizeAnyFramework(value), normalizeFramework(value), `input ${String(value)}`);
  }
  assert.equal(normalizeAnyFramework("UK"), "UK");
  assert.equal(normalizeAnyFramework("IE"), "IE");
  assert.equal(isInternationalFramework("AU"), false);
  assert.equal(isInternationalFramework("NZ"), false);
  assert.equal(isInternationalFramework(undefined), false);
});

test("only visitors in Britain and Ireland get the new demo framework", () => {
  assert.equal(frameworkForCountry("GB"), "UK");
  assert.equal(frameworkForCountry("gb"), "UK");
  assert.equal(frameworkForCountry("IE"), "IE");
  for (const country of ["NZ", "AU", "US", "", null, undefined]) {
    assert.equal(frameworkForCountry(country), null);
  }
});

test("AI helpers see AU and NZ unchanged, and a readable name for UK and IE", () => {
  assert.equal(frameworkPromptValue("AU"), "AU");
  assert.equal(frameworkPromptValue("NZ"), "NZ");
  assert.equal(frameworkPromptValue("UK"), "EYFS (England)");
  assert.equal(frameworkPromptValue("IE"), "Aistear (Ireland)");
});

test("picker labels keep the AU and NZ wording and add England and Ireland", () => {
  assert.equal(FRAMEWORK_LABELS.AU.picker, "EYLF · Australia");
  assert.equal(FRAMEWORK_LABELS.NZ.picker, "Te Whāriki · NZ");
  assert.equal(FRAMEWORK_LABELS.UK.picker, "EYFS · England");
  assert.equal(FRAMEWORK_LABELS.IE.picker, "Aistear · Ireland");
});

test("saved preferences keep UK and IE and still normalise everything else", () => {
  assert.equal(sanitizeStoryPreferences({ defaultFramework: "UK" }).defaultFramework, "UK");
  assert.equal(sanitizeStoryPreferences({ defaultFramework: "IE" }).defaultFramework, "IE");
  assert.equal(sanitizeStoryPreferences({ defaultFramework: "NZ" }).defaultFramework, "NZ");
  assert.equal(sanitizeStoryPreferences({ defaultFramework: "AU" }).defaultFramework, "AU");
  assert.equal(sanitizeStoryPreferences({ defaultFramework: "France" }).defaultFramework, "AU");
  assert.equal(sanitizeStoryPreferences({}).defaultFramework, undefined);
});

test("leak detection catches another country's framework words", () => {
  assert.deepEqual(frameworkLeaks("UK", ["Links to EYFS Understanding the World."]), []);
  assert.equal(frameworkLeaks("UK", ["This links to EYLF Outcome 4."]).length, 1);
  assert.equal(frameworkLeaks("UK", ["Shared with her whānau at pick-up."]).length, 1);
  assert.equal(frameworkLeaks("UK", ["Mana aotūroa: exploration"]).length, 1);
  assert.equal(frameworkLeaks("UK", ["Aistear: Exploring and Thinking"]).length, 1);
  assert.equal(frameworkLeaks("IE", ["EYFS: Mathematics"]).length, 1);
  assert.equal(frameworkLeaks("IE", ["Te Whariki strand"]).length, 1);
  assert.deepEqual(frameworkLeaks("IE", ["Aistear: Wellbeing", "Played tapas restaurant in the home corner."]), []);
});

test("the England prompt names the seven areas and the characteristics, nothing from AU or NZ", () => {
  const prompt = buildInternationalUserMessage({
    observations: `Cooper poured water through the funnel. "It's going fast!"`,
    framework: "UK",
    childName: "Cooper",
    ageGroup: "3-4 years",
    tone: "natural",
    preferences: {},
  });
  // Named exactly as the EYFS statutory framework (effective 1 September 2026) names them.
  for (const area of [
    "Communication and language",
    "Physical development",
    "Personal, social and emotional development",
    "Literacy",
    "Mathematics",
    "Understanding the world",
    "Expressive arts and design",
    "Playing and exploring",
    "Active learning",
    "Creating and thinking critically",
    "characteristic of effective teaching and learning",
  ]) {
    assert.ok(prompt.includes(area), `missing ${area}`);
  }
  assert.match(prompt, /British English/);
  assert.match(prompt, /Do not make Early Learning Goal judgements/);
  assert.doesNotMatch(prompt, /Mana atua|Mana whenua|Belonging, Being and Becoming|EYLF V2\.0/);
  assert.ok(prompt.includes(`"It's going fast!"`));
});

test("the Ireland prompt names the four Aistear Themes and no other framework", () => {
  const prompt = buildInternationalUserMessage({
    observations: "Aoife built a tower and counted the blocks.",
    framework: "IE",
    childName: "Aoife",
    tone: "natural",
    preferences: {},
  });
  for (const theme of ["Wellbeing", "Identity and Belonging", "Communicating", "Exploring and Thinking"]) {
    assert.ok(prompt.includes(theme), `missing ${theme}`);
  }
  assert.match(prompt, /does not number them/);
  assert.doesNotMatch(prompt, /Mana atua|Communication and language|Understanding the world|EYLF V2\.0/i);
});

function draft(overrides: Record<string, unknown>) {
  return normaliseStoryResult({
    storyTitle: "Water on the move",
    story: [
      "Water on the move",
      "",
      "Learning Story",
      `Cooper poured water through the funnel and watched it run out. "It's going fast!" he said, then tried a smaller jug and poured more slowly so it would not spill over the top.`,
      "",
      "What learning we noticed",
      "Cooper was testing an idea and changing what he did when it did not work the first time. He noticed how fast the water moved and tried a slower pour.",
      "",
      "Curriculum links",
      "This links with the EYFS area Understanding the World, as Cooper tested how the water moved through the funnel. It also shows Creating and Thinking Critically.",
      "",
      "Where to next",
      "We will add funnels of different sizes so Cooper can compare how quickly the water flows.",
    ].join("\n"),
    outcomes: ["EYFS: Understanding the World", "Characteristics of effective learning: Creating and Thinking Critically"],
    curriculumLinks: ["Understanding the World: Cooper tested how water moved."],
    nextSteps: ["Offer funnels of different sizes."],
    ...overrides,
  });
}

test("a clean England draft passes the framework check, a leaking one does not", () => {
  const observations = 'Cooper poured water through the funnel. "It\'s going fast!"';
  const clean = inspectInternationalStory(draft({}), { framework: "UK", depth: "concise", observations });
  assert.equal(clean.checks.frameworkLinksFit, true);
  assert.equal(clean.checks.requiredSectionsPresent, true);
  assert.equal(clean.checks.childVoicePreserved, true);
  assert.deepEqual(clean.leaks, []);

  const leaking = inspectInternationalStory(
    draft({ outcomes: ["EYLF Outcome 4: Confident and involved learners"] }),
    { framework: "UK", depth: "concise", observations },
  );
  assert.equal(leaking.checks.frameworkLinksFit, false);
  assert.equal(leaking.leaks.length, 1);

  const asIreland = inspectInternationalStory(draft({}), { framework: "IE", depth: "concise", observations });
  assert.equal(asIreland.checks.frameworkLinksFit, false, "an EYFS draft is wrong for Ireland");
});

test("every international config carries its own transcription hint", () => {
  assert.match(INTERNATIONAL_FRAMEWORKS.UK.transcriptionPrompt, /EYFS/);
  assert.match(INTERNATIONAL_FRAMEWORKS.IE.transcriptionPrompt, /Aistear/);
});

test("insights compass maps EYFS areas and Aistear Themes, and only for that country's stories", () => {
  const uk = buildCurriculumCompass("UK", [
    { id: "s1", location: "UK", outcomes: ["EYFS: Understanding the World"], metadata: {} },
    { id: "s2", location: "UK", outcomes: ["EYFS: Communication and Language"], metadata: {} },
    { id: "s3", location: "AU", outcomes: ["EYLF Outcome 5"], metadata: {} },
  ]);
  assert.equal(uk.length, 7);
  assert.equal(uk.find((item) => item.id === "eyfs-utw")?.count, 1);
  assert.equal(uk.find((item) => item.id === "eyfs-cl")?.count, 1);
  assert.equal(uk.find((item) => item.id === "eyfs-maths")?.count, 0);

  const ie = buildCurriculumCompass("IE", [
    { id: "s1", location: "IE", outcomes: ["Aistear: Exploring and Thinking"], metadata: {} },
  ]);
  assert.equal(ie.length, 4);
  assert.equal(ie.find((item) => item.id === "aistear-exploring")?.count, 1);

  assert.equal(buildCurriculumCompass("AU", []).length, 5);
  assert.equal(buildCurriculumCompass("NZ", []).length, 5);
});

test("export packs name the right curriculum, AU and NZ unchanged", () => {
  const labels = (framework: string) =>
    buildExportPacks({ story: "A story.", framework, curriculumLinks: ["A link."] })
      .flatMap((pack) => pack.sections.map((section) => section.label))
      .filter((label) => label.endsWith(" links"));
  assert.ok(labels("AU").includes("EYLF links"));
  assert.ok(labels("NZ").includes("Te Whāriki links"));
  assert.ok(labels("UK").includes("EYFS links"));
  assert.ok(labels("IE").includes("Aistear links"));
  assert.ok(!labels("UK").some((label) => /EYLF|Whāriki/.test(label)));
});
