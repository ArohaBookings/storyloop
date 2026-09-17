import assert from "node:assert/strict";
import test from "node:test";
import { buildQuietChildRadar, quietSentence, DEFAULT_QUIET_THRESHOLD } from "../lib/quiet-radar";

/**
 * The radar speaks about real children, so every test is about not misleading
 * an educator: no false alarm on a weekend or a holiday, no child hidden, no
 * ranking, and a Today Loop moment counts as noticing.
 */

const children = [
  { id: "a", name: "Aroha" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Charlie" },
];
// Midday NZ time on a given date, as a UTC instant.
const nz = (date: string) => `${date}T00:00:00Z`;
const NZ = { jurisdiction: "NZ" as const, followsSchoolTerms: false };

test("a child seen this week is not flagged; one quiet for two working weeks is", () => {
  const radar = buildQuietChildRadar(children, [
    { childId: "a", createdAt: nz("2026-09-16") },
    { childId: "b", createdAt: nz("2026-09-03") },
  ], { ...NZ, today: "2026-09-17" });
  assert.deepEqual(radar.worthNoticing.map((e) => e.childId), ["b", "c"]);
  assert.deepEqual(radar.noticedRecently.map((e) => e.childId), ["a"]);
});

test("a Today Loop capture counts as noticing, not just a saved story", () => {
  const radar = buildQuietChildRadar(children, [
    { childId: "b", createdAt: nz("2026-09-15") },
  ], { ...NZ, today: "2026-09-17" });
  assert.ok(radar.noticedRecently.some((e) => e.childId === "b"));
});

test("weekends do not count: Friday to the following Wednesday is 3 working days, not 5", () => {
  const radar = buildQuietChildRadar([{ id: "a", name: "Aroha" }], [
    { childId: "a", createdAt: nz("2026-09-11") },
  ], { ...NZ, today: "2026-09-16", thresholdWorkingDays: 4 });
  assert.equal(radar.noticedRecently[0].workingDaysQuiet, 3);
});

test("a term-following service on school holiday flags nobody", () => {
  const radar = buildQuietChildRadar(children, [], {
    jurisdiction: "NZ", followsSchoolTerms: true, today: "2026-10-01",
  });
  assert.equal(radar.onHoliday, true);
  assert.equal(radar.worthNoticing.length, 0);
  assert.equal(radar.noticedRecently.length, 3, "every child is still listed, none is dropped");
});

test("the same holiday date DOES flag for a centre that stays open", () => {
  const radar = buildQuietChildRadar(children, [], { ...NZ, today: "2026-10-01" });
  assert.equal(radar.onHoliday, false);
  assert.equal(radar.worthNoticing.length, 3);
});

test("holiday days are not counted as quiet days once term resumes", () => {
  // Last moment Fri 25 Sep (T3 ends). Holiday until Mon 12 Oct. On Wed 14 Oct:
  // counting holidays would be 13 working days; term-aware it is 3.
  const radar = buildQuietChildRadar([{ id: "a", name: "Aroha" }], [
    { childId: "a", createdAt: nz("2026-09-25") },
  ], { jurisdiction: "NZ", followsSchoolTerms: true, today: "2026-10-14" });
  assert.equal(radar.noticedRecently[0]?.workingDaysQuiet, 3);
});

test("no child is ever dropped, whatever the data", () => {
  const radar = buildQuietChildRadar(children, [
    { childId: null, createdAt: nz("2026-09-16") },
    { childId: "ghost", createdAt: nz("2026-09-16") },
    { childId: "a", createdAt: "not a date" },
  ], { ...NZ, today: "2026-09-17" });
  assert.equal(radar.worthNoticing.length + radar.noticedRecently.length, children.length);
});

test("a moment dated after today is ignored rather than making a child look noticed", () => {
  const radar = buildQuietChildRadar([{ id: "a", name: "Aroha" }], [
    { childId: "a", createdAt: nz("2026-12-01") },
  ], { ...NZ, today: "2026-09-17" });
  assert.equal(radar.worthNoticing[0]?.childId, "a");
});

test("worth-noticing is alphabetical, never ordered by how quiet a child has been", () => {
  const radar = buildQuietChildRadar(
    [{ id: "z", name: "Zara" }, { id: "m", name: "Mere" }, { id: "b", name: "Bella" }],
    [{ childId: "z", createdAt: nz("2026-06-01") }, { childId: "m", createdAt: nz("2026-09-01") }],
    { ...NZ, today: "2026-09-17" },
  );
  assert.deepEqual(radar.worthNoticing.map((e) => e.childName), ["Bella", "Mere", "Zara"]);
});

test("the moment's LOCAL date decides the day, so a late-evening capture is not a day early", () => {
  // 11:30 UTC on 17 Sep = 23:30 in Auckland, the same day as today.
  const radar = buildQuietChildRadar([{ id: "a", name: "Aroha" }], [
    { childId: "a", createdAt: "2026-09-17T11:30:00Z" },
  ], { ...NZ, today: "2026-09-17" });
  assert.equal(radar.noticedRecently[0].lastMomentDate, "2026-09-17");
});

test("this-term counts only include moments inside the current term", () => {
  const radar = buildQuietChildRadar([{ id: "a", name: "Aroha" }], [
    { childId: "a", createdAt: nz("2026-07-01") }, // T2/holiday boundary, before T3
    { childId: "a", createdAt: nz("2026-08-10") },
    { childId: "a", createdAt: nz("2026-09-15") },
  ], { ...NZ, today: "2026-09-17" });
  assert.equal(radar.termLabel, "Term 3 2026");
  assert.equal(radar.noticedRecently[0].momentsThisTerm, 2);
});

test("the sentence states a fact and never a judgement", () => {
  const never = quietSentence({ childId: "a", childName: "A", lastMomentDate: null, workingDaysQuiet: null, momentsThisTerm: 0 }, "Term 3 2026");
  assert.equal(never, "No moments captured yet.");
  const one = quietSentence({ childId: "a", childName: "A", lastMomentDate: "2026-09-16", workingDaysQuiet: 1, momentsThisTerm: 2 }, "Term 3 2026");
  assert.equal(one, "No captured moments in 1 working day.");
  const quietTerm = quietSentence({ childId: "a", childName: "A", lastMomentDate: "2026-06-01", workingDaysQuiet: 60, momentsThisTerm: 0 }, "Term 3 2026");
  assert.match(quietTerm, /None yet in Term 3 2026\./);
  for (const s of [never, one, quietTerm]) {
    assert.ok(!/behind|concern|worry|at risk|fail|score/i.test(s), `judgement language: ${s}`);
  }
});

test("the default threshold is eight working days", () => {
  assert.equal(DEFAULT_QUIET_THRESHOLD, 8);
  assert.equal(buildQuietChildRadar([], [], { ...NZ, today: "2026-09-17" }).threshold, 8);
});
