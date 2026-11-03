import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { auNzPromptCases } from "./fixtures/au-nz-prompt-cases";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "../lib/ai/prompts";
import { STORY_FRAMEWORKS, normalizeFramework } from "../lib/story-options";

// Australian and New Zealand stories must be written exactly as before UK and
// Ireland support was added: same system prompt, same per-story prompt, same
// framework settings. The snapshot was recorded on 13 Oct 2026 before any
// change (tests/fixtures/generate-au-nz-prompt-snapshot.ts). Never regenerate
// it to make this pass; a failure means AU/NZ output would change.
const snapshot = JSON.parse(readFileSync(new URL("./fixtures/au-nz-prompts.json", import.meta.url), "utf8"));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

test("the system prompt for every story is unchanged", () => {
  assert.equal(sha(LEARNING_STORY_PROMPT), snapshot.systemPromptSha256);
});

test("the EYLF and Te Whāriki framework settings are unchanged", () => {
  assert.equal(sha(JSON.stringify(STORY_FRAMEWORKS)), snapshot.frameworksSha256);
});

test("every AU and NZ per-story prompt is byte-identical to before", () => {
  const recorded = new Map<string, string>(snapshot.cases.map((c: { id: string; sha256: string }) => [c.id, c.sha256]));
  const cases = auNzPromptCases();
  assert.equal(cases.length, recorded.size);
  for (const c of cases) {
    const now = sha(buildUserMessage(c.observations, c.ageGroup, c.childName, c.tone, c.framework, c.preferences, c.childContext, c.educatorNames));
    assert.equal(now, recorded.get(c.id), `prompt changed for ${c.id}`);
  }
});

test("AU and NZ still resolve exactly as before", () => {
  assert.equal(normalizeFramework("NZ"), "NZ");
  assert.equal(normalizeFramework("AU"), "AU");
  assert.equal(normalizeFramework(undefined), "AU");
  assert.equal(normalizeFramework(null), "AU");
});

// "Speak to the child" (3 Nov 2026): off (or not passed) changes nothing; on adds
// one block just before the final line and nothing else.
test("'speak to the child' off leaves every prompt byte-identical; on adds one block only", () => {
  for (const c of auNzPromptCases()) {
    const args = [c.observations, c.ageGroup, c.childName, c.tone, c.framework, c.preferences, c.childContext, c.educatorNames] as const;
    const before = buildUserMessage(...args);
    assert.equal(buildUserMessage(...args, false), before, `${c.id}: false must change nothing`);
    assert.equal(buildUserMessage(...args, undefined), before, `${c.id}: undefined must change nothing`);
    const on = buildUserMessage(...args, true);
    assert.ok(on.includes("SPEAK TO THE CHILD") && on.includes('using "you"'), c.id);
    // Removing the block gives back exactly the original message.
    assert.equal(on.replace(/\nSPEAK TO THE CHILD[\s\S]*?as usual\.\n/, ""), before, `${c.id}: nothing but the block may differ`);
  }
});

// 4 Nov 2026: live, a "To the child" story that named the child once and then
// said "you" was rejected by the centring check (name at least twice) and
// replaced by the safety-net template. With the choice on, one mention and
// steady "you" now counts as centred; off, the check is exactly what it was.
test("'to the child' stories are not rejected for naming the child once; off, the centring check is unchanged", async () => {
  const { inspectStoryQuality } = await import("../lib/ai/quality-guards");
  const base = {
    storyTitle: "Your turn",
    outcomes: [], curriculumLinks: ["Mana tangata | Contribution"], learningSummary: "Turn taking.", childVoice: "your turn",
    learningDispositions: [], socialEmotionalLinks: [], culturalConnections: [], whanauConnection: "", assumptions: [],
    evidenceAnchors: ["She rolled it again and gave it to Hemi: 'your turn'"],
    educatorChecks: [], pedagogyLinks: [], frameworkEvidence: [], familyQuestion: "", followUpPrompt: "",
    nextSteps: ["Offer more playdough turns."], wordCount: 30,
  };
  const params = { framework: "NZ" as const, depth: "balanced" as const, observations: "Mere rolled a snake, squashed it flat, then gave it to Hemi: 'your turn'.", childName: "Mere" };
  const once = { ...base, story: "Mere, you rolled a long snake and squashed it flat. Then you gave it to Hemi and said \"your turn\". You took turns three times, and you waited each time." };
  const twice = { ...base, story: "Mere rolled a long snake and squashed it flat. Then Mere gave it to Hemi and said \"your turn\"." };
  const never = { ...base, story: "You rolled a long snake and squashed it flat. You gave it to Hemi. You took turns three times, and you waited." };
  const barelyYou = { ...base, story: "Mere rolled a long snake and squashed it flat. Then she gave it to Hemi. You could see the turn taking." };

  // Off: exactly the old rule (name at least twice).
  assert.equal(inspectStoryQuality(once, params).focusChildMaintained, false);
  assert.equal(inspectStoryQuality(twice, params).focusChildMaintained, true);
  assert.equal(inspectStoryQuality(never, params).focusChildMaintained, false);
  assert.equal(inspectStoryQuality(once, { ...params, speakToChild: false }).focusChildMaintained, false);
  // On: named once and spoken to as "you" is centred; never named, or barely "you", is not.
  assert.equal(inspectStoryQuality(once, { ...params, speakToChild: true }).focusChildMaintained, true);
  assert.equal(inspectStoryQuality(twice, { ...params, speakToChild: true }).focusChildMaintained, true);
  assert.equal(inspectStoryQuality(never, { ...params, speakToChild: true }).focusChildMaintained, false);
  assert.equal(inspectStoryQuality(barelyYou, { ...params, speakToChild: true }).focusChildMaintained, false);
});
