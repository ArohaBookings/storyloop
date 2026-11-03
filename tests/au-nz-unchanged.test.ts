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
