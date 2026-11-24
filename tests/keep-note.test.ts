import assert from "node:assert/strict";
import test from "node:test";
import { cleanKeptNote, demoUsedOn, localDay, noteToKeep, KEEP_NOTE_MAX_AGE_MS } from "../lib/keep-story";

const SAMPLE = "Noah (3yo) filled a bucket with damp sand, turned it over carefully and tapped the sides.";
const MINE = "Ari spent the morning sorting shells by size and told me the big ones were the grandads.";

test("her own typed note is kept; the sample, the unchanged example and a too-short note are not", () => {
  assert.equal(noteToKeep(`  ${MINE} `, [SAMPLE]), MINE);
  assert.equal(noteToKeep(SAMPLE, [SAMPLE]), null, "sample refused");
  assert.equal(noteToKeep("too short", []), null);
  assert.equal(noteToKeep("x".repeat(2001), []), null);
});

test("a kept note lasts 2 hours", () => {
  const now = Date.now();
  assert.equal(cleanKeptNote({ note: MINE, at: now - 1000 }, now), MINE);
  assert.equal(cleanKeptNote({ note: MINE, at: now - KEEP_NOTE_MAX_AGE_MS - 1 }, now), null, "expired");
  assert.equal(cleanKeptNote({ note: "short", at: now }, now), null);
  assert.equal(cleanKeptNote(null, now), null);
});

test("the demo counts per browser per day, not per page load", () => {
  const now = Date.parse("2026-11-25T10:00:00");
  assert.equal(demoUsedOn({ day: localDay(now), n: 1 }, now), true);
  assert.equal(demoUsedOn({ day: localDay(now - 86_400_000), n: 3 }, now), false, "yesterday's try does not count today");
  assert.equal(demoUsedOn({ day: localDay(now), n: 0 }, now), false);
  assert.equal(demoUsedOn("junk", now), false);
});
