import assert from "node:assert/strict";
import test from "node:test";
import { KEEP_STORY_MAX_AGE_MS, cleanKeptStory, frameworkFromStory, keptStoryTitle } from "../lib/keep-story";
import { EXIT_REASONS, cleanExitFeedback } from "../lib/exit-feedback";
import { enoughNotes, notesFromStories, statementFrameworkFor } from "../lib/child-statement";

const story = "Ruby feeding herself\n\nLearning Story\nAt morning tea, Ruby fed herself yoghurt using a spoon. When she finished, she said, \"all gone\". EYLF Outcome 3.";

test("a kept demo story is only trusted when it is the right shape and recent", () => {
  const now = Date.UTC(2026, 10, 3);
  const ok = cleanKeptStory({ note: " Ruby said 'all gone' ", story, framework: "AU", at: now - 1000 }, now);
  assert.ok(ok);
  assert.equal(ok.note, "Ruby said 'all gone'");
  assert.equal(ok.framework, "AU");
  assert.equal(cleanKeptStory({ note: "x", story: "too short", framework: "AU", at: now }, now), null, "a story too short to be a draft");
  assert.equal(cleanKeptStory({ note: "x", story, framework: "AU", at: now - KEEP_STORY_MAX_AGE_MS - 1 }, now), null, "older than a week");
  assert.equal(cleanKeptStory({ note: "x", story, framework: "AU", at: now + 3_600_000 }, now), null, "from the future");
  assert.equal(cleanKeptStory({ note: "", story, framework: "AU", at: now }, now), null, "no note");
  assert.equal(cleanKeptStory({ note: "x", story, framework: "US", at: now }, now)?.framework, null, "an unknown curriculum is dropped, not trusted");
  assert.equal(cleanKeptStory("nope", now), null);
  assert.equal(cleanKeptStory(null, now), null);
  assert.equal(cleanKeptStory({ note: "x", story: "y".repeat(9000), framework: "AU", at: now }, now), null, "far longer than any draft");
});

test("the kept story's title and curriculum come from the draft itself", () => {
  assert.equal(keptStoryTitle(story), "Ruby feeding herself");
  assert.equal(keptStoryTitle("   \n\n"), "My first learning story");
  assert.equal(frameworkFromStory("Curriculum links\nMana aotūroa | Exploration"), "NZ");
  assert.equal(frameworkFromStory("This links with EYLF Outcome 4"), "AU");
  assert.equal(frameworkFromStory("EYFS: Communication and language"), "UK");
  assert.equal(frameworkFromStory("Aistear: Exploring and Thinking"), "IE");
  assert.equal(frameworkFromStory("No curriculum named"), null);
});

test("exit feedback keeps a known reason and a short note, never contact details", () => {
  assert.deepEqual(cleanExitFeedback({ reason: "price", surface: "home", text: "" }), { reason: "price", surface: "home", text: "" });
  assert.equal(cleanExitFeedback({ reason: "made-up", surface: "home" }), null);
  assert.equal(cleanExitFeedback({ reason: "price", surface: "elsewhere" }), null);
  const cleaned = cleanExitFeedback({ reason: "something_else", surface: "guide", text: "email me at jo@example.com or 021 555 1234 please" });
  assert.ok(cleaned);
  assert.ok(!cleaned.text.includes("@") && !cleaned.text.includes("555"), cleaned.text);
  assert.equal(cleanExitFeedback({ reason: "too_busy", surface: "signup", text: "x".repeat(900) })?.text.length, 300);
  // The labels people see never name another product.
  const rivals = /\b(story ?park|educa|chat ?gpt|openai|claude|gemini|grok|copilot|perplexity)\b/i;
  for (const reason of EXIT_REASONS) assert.ok(!rivals.test(reason.label), reason.label);
});

test("a child's notes for the statement are their own observations, dated, newest that fit, oldest first", () => {
  const stories = [
    { date: "2026-03-02", observations: "Mia hung her bag up herself and said 'my bag'." },
    { date: "2026-08-10", observations: "Mia waved to Dad and walked to the sandpit with Sam." },
    { date: "2026-05-20", observations: "ok" },
    { date: "2026-10-01", observations: "Mia counted eight blocks and said 'now it's ten' after adding two." },
  ];
  const { notes, used } = notesFromStories(stories);
  assert.equal(used, 3, "the two-letter note is skipped");
  assert.ok(notes.startsWith("2026-03-02: Mia hung her bag"), notes);
  assert.ok(notes.trim().endsWith("after adding two."), notes);
  assert.ok(enoughNotes(notes));
  const tight = notesFromStories(stories, 130);
  assert.ok(tight.used >= 1 && tight.notes.length <= 130, "only what fits");
  assert.ok(tight.notes.includes("2026-10-01"), "the newest notes are kept first");
  assert.equal(statementFrameworkFor("NZ"), "TW");
  assert.equal(statementFrameworkFor("AU"), "EYLF");
  assert.equal(statementFrameworkFor(null), "EYLF");
  assert.equal(statementFrameworkFor("UK"), null);
});
