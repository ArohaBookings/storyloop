import assert from "node:assert/strict";
import test from "node:test";
import { computePublicStats, oneIn, MIN_EDUCATORS, MIN_STORIES, type StatsRow } from "../lib/public-stats";

function rows(count: number, educators: number, overrides: Partial<StatsRow> = {}): StatsRow[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `u${i % educators}`,
    observations: "Aroha stacked the blocks and said up up up",
    storyText: "word ".repeat(300 + (i % 3) * 10),
    hasCurriculumLinks: i % 50 !== 0,
    privacyIssueCount: i % 20 === 0 ? 1 : 0,
    assumptionCount: 2,
    inputMethod: i % 4 === 0 ? "voice" : "typed",
    ...overrides,
  }));
}

test("nothing is published below the minimum sample", () => {
  assert.equal(computePublicStats(rows(MIN_STORIES - 1, 40)), null);
  assert.equal(computePublicStats(rows(500, MIN_EDUCATORS - 1)), null, "many stories from few educators could identify them");
});

test("the example note never counts as real documentation", () => {
  const all = [...rows(120, 30), ...rows(400, 30, { inputMethod: "sample" })];
  assert.equal(computePublicStats(all)?.stories, 120);
});

test("the numbers are medians and whole percentages", () => {
  const stats = computePublicStats(rows(200, 40))!;
  assert.equal(stats.stories, 200);
  assert.equal(stats.educators, 40);
  assert.equal(stats.medianNoteWords, 9);
  assert.equal(stats.medianDraftWords, 310);
  assert.equal(stats.withCurriculumLinks, 98);
  assert.equal(stats.withPrivacyFlag, 5);
  assert.equal(stats.withAssumptionsRaised, 100);
  assert.equal(stats.spoken, 25);
});

test("the output carries no text, only numbers", () => {
  const stats = computePublicStats(rows(200, 40))!;
  for (const value of Object.values(stats)) assert.equal(typeof value, "number");
  assert.doesNotMatch(JSON.stringify(stats), /Aroha/);
});

test("percentages read as plain phrases", () => {
  assert.equal(oneIn(5), "about 1 in 20");
  assert.equal(oneIn(0), null);
  assert.equal(oneIn(100), null);
});
