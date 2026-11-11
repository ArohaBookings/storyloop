import { test } from "node:test";
import assert from "node:assert/strict";
import { ANONYMOUS_REVIEWER, STORY_REVIEW_GAP_DAYS, STORY_REVIEW_MIN_STORIES, cleanRating, shouldAskAtStory } from "../lib/review-ask";
import { shortenName } from "../lib/reviews";
import { cleanFirstName, frameworkForZone } from "../lib/statement-from-notes";

const base = { stories: STORY_REVIEW_MIN_STORIES, reviews: 0, internal: false, lastAskedAt: null };

test("the review ask waits for the third story", () => {
  assert.equal(shouldAskAtStory({ ...base, stories: 2 }), false);
  assert.equal(shouldAskAtStory(base), true);
});

test("nobody who has reviewed, and no internal account, is asked", () => {
  assert.equal(shouldAskAtStory({ ...base, reviews: 1 }), false);
  assert.equal(shouldAskAtStory({ ...base, internal: true }), false);
});

test("one ask a month for an account, then it may ask again", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  assert.equal(shouldAskAtStory({ ...base, lastAskedAt: days(1), now }), false);
  assert.equal(shouldAskAtStory({ ...base, lastAskedAt: days(STORY_REVIEW_GAP_DAYS - 1), now }), false);
  assert.equal(shouldAskAtStory({ ...base, lastAskedAt: days(STORY_REVIEW_GAP_DAYS + 1), now }), true);
  // A date that cannot be read never blocks the ask forever.
  assert.equal(shouldAskAtStory({ ...base, lastAskedAt: "not a date", now }), true);
});

test("a rating is a whole number from one to five", () => {
  assert.equal(cleanRating(5), 5);
  assert.equal(cleanRating("3"), 3);
  for (const bad of [0, 6, 2.5, "five", null, undefined]) assert.equal(cleanRating(bad), null);
});

test("a reviewer who asked for no name is never shortened into one", () => {
  assert.equal(shortenName(ANONYMOUS_REVIEWER), ANONYMOUS_REVIEWER);
  assert.equal(shortenName("Mia Thompson"), "Mia T.");
});

test("the statement page takes a first name only", () => {
  assert.equal(cleanFirstName("  Arlo James Smith "), "Arlo");
  assert.equal(cleanFirstName("Te-Ariki"), "Te-Ariki");
  assert.equal(cleanFirstName("Mia<script>"), "Miascript");
  assert.equal(cleanFirstName(42), "");
  assert.equal(cleanFirstName("x".repeat(80)).length, 30);
});

test("the first curriculum offered follows the time zone", () => {
  assert.equal(frameworkForZone("Pacific/Auckland"), "TW");
  assert.equal(frameworkForZone("Australia/Melbourne"), "VEYLDF");
  assert.equal(frameworkForZone("Australia/Brisbane"), "QKLG");
  assert.equal(frameworkForZone("Australia/Sydney"), "EYLF");
  assert.equal(frameworkForZone(""), "EYLF");
  assert.equal(frameworkForZone(null), "EYLF");
});
