/**
 * Writes tests/fixtures/au-nz-prompts.json: the exact prompts StoryLoop builds
 * for Australian and New Zealand stories. Run ONCE, before any change near the
 * story generator; tests/au-nz-unchanged.test.ts then proves later code builds
 * byte-identical prompts (13 Oct 2026, before UK and Ireland support).
 *   npx tsx tests/fixtures/generate-au-nz-prompt-snapshot.ts
 */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { auNzPromptCases } from "./au-nz-prompt-cases";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "../../lib/ai/prompts";
import { STORY_FRAMEWORKS } from "../../lib/story-options";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const cases = auNzPromptCases().map((c) => ({
  id: c.id,
  sha256: sha(buildUserMessage(c.observations, c.ageGroup, c.childName, c.tone, c.framework, c.preferences, c.childContext, c.educatorNames)),
}));
writeFileSync(
  new URL("./au-nz-prompts.json", import.meta.url),
  JSON.stringify({
    recordedAt: "2026-10-13",
    systemPromptSha256: sha(LEARNING_STORY_PROMPT),
    frameworksSha256: sha(JSON.stringify(STORY_FRAMEWORKS)),
    cases,
  }, null, 1),
);
console.log(`recorded ${cases.length} AU/NZ prompt cases`);
