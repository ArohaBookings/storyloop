import assert from "node:assert/strict";
import test from "node:test";
import { buildYearBoard, teachingYear, yearStart, YEAR_THIN_STORIES, type YearChild, type YearStory } from "../lib/year-board";

const NOW = new Date("2026-11-10T02:00:00Z");
const child = (id: string, name: string, over: Partial<YearChild> = {}): YearChild => ({ id, name, age_group: "Preschool", interests: [], home_languages: [], ...over });
const story = (childId: string | null, name: string, at: string, over: Partial<YearStory> = {}): YearStory => ({ child_id: childId, child_name: name, created_at: at, outcomes: [], next_steps: [], ...over });

test("the teaching year is the calendar year in New Zealand, from 1 January there", () => {
  assert.equal(teachingYear(NOW), 2026);
  // 31 Dec 2026 11:30 UTC is already 1 Jan 2027 in New Zealand.
  assert.equal(teachingYear(new Date("2026-12-31T11:30:00Z")), 2027);
  assert.equal(yearStart(2026).toISOString(), "2025-12-31T11:00:00.000Z");
});

test("each child is counted from their own stories this year, thinnest first", () => {
  const board = buildYearBoard(
    [child("a", "Ruby"), child("b", "Tama"), child("c", "Arjun")],
    [
      story("a", "Ruby", "2026-03-01T00:00:00Z"), story("a", "Ruby", "2026-05-01T00:00:00Z"), story("a", "Ruby", "2026-09-01T00:00:00Z"),
      story("b", "Tama", "2026-06-01T00:00:00Z"),
      story("a", "Ruby", "2025-06-01T00:00:00Z"), // last year: not counted
    ],
    NOW,
  );
  assert.deepEqual(board.rows.map((r) => [r.name, r.stories, r.thin]), [["Arjun", 0, true], ["Tama", 1, true], ["Ruby", 3, false]]);
  assert.equal(board.stories, 4);
  assert.equal(board.children, 3);
  assert.equal(board.ready, 1);
  assert.equal(board.thin, 2);
  assert.equal(YEAR_THIN_STORIES, 3);
});

test("what the stories were about and the newest next step come from the stories, nothing else", () => {
  const board = buildYearBoard(
    [child("a", "Ruby", { interests: ["water", "blocks"], home_languages: ["Samoan"] })],
    [
      story("a", "Ruby", "2026-03-01T00:00:00Z", { outcomes: ["Outcome 4.1", "Outcome 5.1"], next_steps: ["Offer bigger jugs"] }),
      story("a", "Ruby", "2026-05-01T00:00:00Z", { outcomes: ["Outcome 4.1"], next_steps: ["  "] }),
      story("a", "Ruby", "2026-09-01T00:00:00Z", { outcomes: ["Outcome 4.1", "Outcome 1.2"], next_steps: ["Count the pours together"] }),
    ],
    NOW,
  );
  const [ruby] = board.rows;
  assert.equal(ruby.topLinks[0], "Outcome 4.1");
  assert.equal(ruby.topLinks.length, 3);
  assert.equal(ruby.workingOn, "Count the pours together");
  assert.deepEqual(ruby.interests, ["water", "blocks"]);
  assert.deepEqual(ruby.homeLanguages, ["Samoan"]);
  assert.equal(ruby.firstStory, "2026-03-01T00:00:00Z");
  assert.equal(ruby.lastStory, "2026-09-01T00:00:00Z");
});

test("a story saved without a profile joins the one child with that first name, and is never guessed between two", () => {
  const one = buildYearBoard([child("a", "Ruby Smith")], [story(null, "ruby", "2026-04-01T00:00:00Z")], NOW);
  assert.deepEqual(one.rows.map((r) => [r.id, r.stories]), [["a", 1]]);
  assert.equal(one.unlinkedStories, 0);

  const two = buildYearBoard([child("a", "Ruby S"), child("b", "Ruby T")], [story(null, "Ruby", "2026-04-01T00:00:00Z")], NOW);
  assert.deepEqual(two.rows.map((r) => [r.id, r.name, r.stories]), [["a", "Ruby S", 0], ["b", "Ruby T", 0], [null, "Ruby", 1]]);
  assert.equal(two.unlinkedStories, 1);

  const none = buildYearBoard([], [story(null, "Mia", "2026-04-01T00:00:00Z"), story(null, "", "2026-04-02T00:00:00Z")], NOW);
  assert.deepEqual(none.rows.map((r) => [r.id, r.name, r.stories]), [[null, "Mia", 1]]);
});

test("an empty year is an empty board, not an error", () => {
  const board = buildYearBoard([], [], NOW);
  assert.equal(board.rows.length, 0);
  assert.equal(board.stories, 0);
});
