import assert from "node:assert/strict";
import test from "node:test";
import { recoverMangledPath } from "../lib/mangled-paths";

test("recovers the five broken links from the 29 Sep 2026 Facebook posts", () => {
  assert.equal(recoverMangledPath("examplesIf"), "/examples");
  assert.equal(recoverMangledPath("ai-tools-for-learning-storiesFull"), "/ai-tools-for-learning-stories");
  assert.equal(recoverMangledPath("learning-story-templateStoryLoop"), "/learning-story-template");
  assert.equal(recoverMangledPath("observation-methods-early-childhoodThere's"), "/observation-methods-early-childhood");
  assert.equal(recoverMangledPath("observation-methods-early-childhoodThere%27s"), "/observation-methods-early-childhood");
  assert.equal(recoverMangledPath("ero-early-childhood-regulation-2026Disclosure"), "/ero-early-childhood-regulation-2026");
});

test("prefers the longest page name", () => {
  assert.equal(recoverMangledPath("eylf-learning-storiesAnd"), "/eylf-learning-stories");
});

test("leaves real 404s alone", () => {
  assert.equal(recoverMangledPath("not-a-page"), null);
  assert.equal(recoverMangledPath("examples"), null);
  // A hyphen means a different page name, not stray text.
  assert.equal(recoverMangledPath("examples-of-something"), null);
  assert.equal(recoverMangledPath("examples" + "x".repeat(60)), null);
});
