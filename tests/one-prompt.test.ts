import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PROMPT_ORDER, mayShowPrompt, promptOnScreen, type PromptsWanted, type StoryPrompt } from "../lib/one-prompt";

// One prompt at a time on the story page (19 Nov 2026): never two on one screen.

test("the most important prompt that wants the screen is the one on it", () => {
  assert.deepEqual([...PROMPT_ORDER], ["wall", "next_story", "upgrade", "review_ask", "price_reminder"]);
  assert.equal(promptOnScreen({}), null, "nothing wants it: nothing shows");
  assert.equal(promptOnScreen({ review_ask: true }), "review_ask");
  assert.equal(promptOnScreen({ wall: true, review_ask: true }), "wall", "the wall comes first");
  assert.equal(promptOnScreen({ next_story: true, upgrade: true }), "next_story", "the next-story card before an upgrade prompt");
  assert.equal(promptOnScreen({ upgrade: true, review_ask: true }), "upgrade", "the review ask waits for the upgrade prompt");
  assert.equal(promptOnScreen({ wall: false, upgrade: false, review_ask: true }), "review_ask", "a prompt that does not want the screen holds nothing back");
});

test("of any two prompts that want the screen, exactly one may show", () => {
  for (const a of PROMPT_ORDER) {
    for (const b of PROMPT_ORDER) {
      if (a === b) continue;
      const wanted: PromptsWanted = { [a]: true, [b]: true };
      const showing = PROMPT_ORDER.filter((prompt) => wanted[prompt] && mayShowPrompt(prompt, wanted));
      assert.equal(showing.length, 1, `${a} and ${b}: one at a time`);
      assert.equal(showing[0], PROMPT_ORDER.indexOf(a) < PROMPT_ORDER.indexOf(b) ? a : b);
    }
  }
  const everything = Object.fromEntries(PROMPT_ORDER.map((prompt) => [prompt, true])) as Record<StoryPrompt, boolean>;
  assert.deepEqual(PROMPT_ORDER.filter((prompt) => mayShowPrompt(prompt, everything)), ["wall"], "all at once: the wall alone");
});

test("the review ask waits while another prompt is up, and may show once it has gone", () => {
  assert.equal(mayShowPrompt("review_ask", { upgrade: true }), false, "not beside '1 free story left this month'");
  assert.equal(mayShowPrompt("review_ask", { next_story: true }), false, "not beside the next-story card");
  assert.equal(mayShowPrompt("review_ask", { wall: true }), false, "not beside the wall");
  assert.equal(mayShowPrompt("review_ask", { wall: false, next_story: false, upgrade: false }), true, "once they are closed, it may");
  assert.equal(mayShowPrompt("price_reminder", { review_ask: true }), false, "the price line never shows beside another prompt");
  assert.equal(mayShowPrompt("wall", { next_story: true, upgrade: true, review_ask: true }), true, "the wall is never held back");
});

test("the story page asks this one place before it shows any of them", () => {
  const page = readFileSync(new URL("../app/(app)/generate/page.tsx", import.meta.url), "utf8");
  for (const prompt of ["next_story", "upgrade", "review_ask", "price_reminder"]) {
    assert.ok(page.includes(`mayShowPrompt("${prompt}", promptsWanted)`), `${prompt} goes through lib/one-prompt.ts`);
  }
  assert.match(page, /noteReviewCopy = \(\) => \{\s*if \(!mayShowPrompt\("review_ask", promptsWanted\)\) return;/, "a copy made while another prompt is up does not bring the ask");
});
