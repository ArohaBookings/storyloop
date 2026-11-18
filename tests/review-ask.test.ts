import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  ANONYMOUS_REVIEWER,
  ASKED_EVENTS,
  COPY_EVENTS,
  COPY_REVIEW_MIN_COPIES,
  DISMISSED_EVENT,
  STORY_REVIEW_GAP_DAYS,
  cleanRating,
  cleanStoryId,
  countCopies,
  shouldAskAtCopy,
} from "../lib/review-ask";
import { isEventName, sanitizeEventMetadata } from "../lib/analytics/events";
import { shortenName } from "../lib/reviews";
import { cleanFirstName, frameworkForZone } from "../lib/statement-from-notes";

const base = { copies: COPY_REVIEW_MIN_COPIES, reviews: 0, internal: false, dismissed: false, lastAskedAt: null };
const A = "3f2b8c1e-9a4d-4c7b-8e21-6d5a0b9c1f42";
const B = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

test("the ask waits for her second copy", () => {
  assert.equal(COPY_REVIEW_MIN_COPIES, 2);
  assert.equal(shouldAskAtCopy({ ...base, copies: 0 }), false);
  assert.equal(shouldAskAtCopy({ ...base, copies: 1 }), false, "never at the first copy");
  assert.equal(shouldAskAtCopy(base), true);
  assert.equal(shouldAskAtCopy({ ...base, copies: 9 }), true);
  assert.equal(shouldAskAtCopy({ ...base, copies: Number.NaN }), false);
});

test("two copies of the same story are one copy", () => {
  assert.equal(countCopies([]), 0);
  assert.equal(countCopies([{ metadata: { story_id: A } }, { metadata: { story_id: A.toUpperCase() } }]), 1);
  assert.equal(countCopies([{ metadata: { story_id: A } }, { metadata: { story_id: B } }]), 2);
  assert.equal(countCopies([{ metadata: {} }, { metadata: null }, null]), 2, "a copy of a story not saved yet counts on its own");
  assert.equal(countCopies([{ metadata: { story_id: "Mia's story" } }]), 1, "a value that is not an id is not trusted as one");
});

test("No thanks is for good; a reviewer and an internal account are never asked", () => {
  assert.equal(shouldAskAtCopy({ ...base, dismissed: true }), false);
  assert.equal(shouldAskAtCopy({ ...base, dismissed: true, lastAskedAt: "2020-01-01T00:00:00Z" }), false, "however long ago");
  assert.equal(shouldAskAtCopy({ ...base, reviews: 1 }), false);
  assert.equal(shouldAskAtCopy({ ...base, internal: true }), false);
});

test("never twice in 30 days, whatever device", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  assert.equal(STORY_REVIEW_GAP_DAYS, 30);
  assert.equal(shouldAskAtCopy({ ...base, lastAskedAt: days(1), now }), false);
  assert.equal(shouldAskAtCopy({ ...base, lastAskedAt: days(STORY_REVIEW_GAP_DAYS - 1), now }), false);
  assert.equal(shouldAskAtCopy({ ...base, lastAskedAt: new Date(now.getTime() - 3_600_000), now }), false);
  assert.equal(shouldAskAtCopy({ ...base, lastAskedAt: days(STORY_REVIEW_GAP_DAYS + 1), now }), true);
  // A date that cannot be read never blocks the ask forever.
  assert.equal(shouldAskAtCopy({ ...base, lastAskedAt: "not a date", now }), true);
});

test("the events it reads and writes are on the list, and carry ids and ratings only", () => {
  for (const name of [...COPY_EVENTS, "review_ask_shown", "review_ask_sent", DISMISSED_EVENT]) assert.ok(isEventName(name), name);
  assert.ok(ASKED_EVENTS.includes("story_rating"), "a star tapped under the 13 Nov ask still counts as asked");
  assert.deepEqual(sanitizeEventMetadata("review_ask_sent", { story_id: A, rating: 4, body: "Lovely" }), { story_id: A, rating: 4 });
  assert.deepEqual(sanitizeEventMetadata("review_ask_dismissed", { story_id: A, email: "a@b.nz" }), { story_id: A });
  assert.equal(cleanStoryId(A.toUpperCase()), A);
  for (const bad of ["", "Mia", 42, null, `${A}x`]) assert.equal(cleanStoryId(bad), null, String(bad));
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

test("one ask, at the copy: the dashboard no longer asks, and the server only says yes at a copy", () => {
  const dashboard = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.doesNotMatch(dashboard, /ReviewPrompt|askForReview/);
  assert.equal(existsSync("components/app/ReviewPrompt.tsx"), false);
  const route = readFileSync("app/api/reviews/ask/route.ts", "utf8");
  assert.match(route, /searchParams\.get\("at"\) !== "copy"/);
  assert.match(route, /shouldAskAtCopy\(/);
  const page = readFileSync("app/(app)/generate/page.tsx", "utf8");
  assert.match(page, /<StoryReviewAsk storyId=\{storyId\} copies=\{reviewCopies\} \/>/);
  const history = readFileSync("components/app/StoryHistoryItem.tsx", "utf8");
  assert.match(history, /<StoryReviewAsk storyId=\{story\.id\} copies=\{reviewCopies\} page="\/history" \/>/);
});

test("public pages show real published reviews only, and never a number of them", () => {
  const proof = readFileSync("components/landing/ReviewProof.tsx", "utf8");
  assert.match(proof, /listPublishedReviews\(/);
  assert.match(proof, /if \(reviews\.length === 0\) return null;/, "nothing at all until one is published");
  assert.doesNotMatch(proof, /reviewSummary\(|summary\.|\.length\}|reviews\.length >/, "no counts, no averages");
  const signup = readFileSync("app/(auth)/signup/page.tsx", "utf8");
  assert.match(signup, /<ReviewProof /);
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
