import assert from "node:assert/strict";
import test from "node:test";
import {
  TERM_CALENDARS,
  addDays,
  currentOrNextTerm,
  dayOfWeek,
  isSchoolHoliday,
  latestStartedTerm,
  localDate,
  termCoverageGaps,
  termOn,
  workingDaysBetween,
  type Jurisdiction,
} from "../lib/terms";

/**
 * A mistyped term date would mislabel a real child as quiet, or hide one, so
 * every calendar is checked against the rules any genuine school year obeys
 * before any single date is trusted.
 */

const ALL = Object.keys(TERM_CALENDARS) as Jurisdiction[];
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

test("every calendar is a plausible school year: four ordered, non-overlapping weekday terms", () => {
  for (const jurisdiction of ALL) {
    for (const year of TERM_CALENDARS[jurisdiction]) {
      const label = `${jurisdiction} ${year.year}`;
      assert.deepEqual(year.terms.map((t) => t.term), [1, 2, 3, 4], `${label}: terms out of order`);
      for (const term of year.terms) {
        assert.match(term.start, /^\d{4}-\d{2}-\d{2}$/, `${label} T${term.term} start format`);
        assert.equal(term.start.slice(0, 4), String(year.year), `${label} T${term.term} start in wrong year`);
        assert.equal(term.end.slice(0, 4), String(year.year), `${label} T${term.term} end in wrong year`);
        assert.ok(term.start < term.end, `${label} T${term.term} ends before it starts`);
        for (const edge of [term.start, term.end]) {
          const dow = dayOfWeek(edge);
          assert.ok(dow !== 0 && dow !== 6, `${label} T${term.term} has a weekend boundary ${edge}`);
        }
        const length = daysBetween(term.start, term.end);
        assert.ok(length >= 42 && length <= 90, `${label} T${term.term} is ${length} days long`);
      }
      for (let i = 1; i < year.terms.length; i++) {
        const gap = daysBetween(year.terms[i - 1].end, year.terms[i].start);
        assert.ok(gap >= 4 && gap <= 30, `${label}: holiday before T${i + 1} is ${gap} days`);
      }
    }
  }
});

test("dates read directly from official pages are stored exactly", () => {
  const exact: Array<[Jurisdiction, string, 1 | 2 | 3 | 4]> = [
    ["NZ", "2026-07-20", 3], ["NZ", "2026-09-25", 3], ["NZ", "2026-10-12", 4],
    ["NZ", "2027-04-27", 2], ["VIC", "2026-01-27", 1], ["VIC", "2026-12-18", 4],
    ["VIC", "2027-03-25", 1], ["NSW", "2027-12-20", 4],
  ];
  for (const [jurisdiction, date, term] of exact) {
    assert.equal(termOn(date, jurisdiction)?.term, term, `${jurisdiction} ${date}`);
  }
});

test("today in Christchurch is Term 3, and the first week of October is a holiday", () => {
  assert.equal(termOn("2026-09-17", "NZ")?.term, 3);
  assert.equal(isSchoolHoliday("2026-10-01", "NZ"), true);
  assert.equal(isSchoolHoliday("2026-09-17", "NZ"), false);
});

test("a year with no calendar is unknown, never assumed to be a holiday", () => {
  assert.equal(isSchoolHoliday("2028-03-01", "NZ"), null);
  assert.equal(isSchoolHoliday("2027-03-01", "QLD"), null);
  assert.equal(termOn("2028-03-01", "NZ"), null);
});

test("working days skip weekends always, and school holidays only when the service follows terms", () => {
  // Fri 25 Sep 2026 (NZ T3 ends) to Fri 16 Oct: 15 weekdays, 10 of them in the holiday.
  const year = { jurisdiction: "NZ" as const };
  assert.equal(workingDaysBetween("2026-09-25", "2026-10-16", { ...year, followsSchoolTerms: false }), 15);
  assert.equal(workingDaysBetween("2026-09-25", "2026-10-16", { ...year, followsSchoolTerms: true }), 5);
});

test("a missing calendar can only make a quiet-child signal fire sooner, never hide a child", () => {
  // 2028 has no data: every weekday counts even for a term-following service.
  const followsTerms = workingDaysBetween("2028-01-03", "2028-01-14", { jurisdiction: "NZ", followsSchoolTerms: true });
  const ignoresTerms = workingDaysBetween("2028-01-03", "2028-01-14", { jurisdiction: "NZ", followsSchoolTerms: false });
  assert.equal(followsTerms, ignoresTerms);
  assert.equal(ignoresTerms, 9);
});

test("working days handles bad and backwards ranges without throwing", () => {
  const o = { jurisdiction: "NZ" as const, followsSchoolTerms: true };
  assert.equal(workingDaysBetween("2026-10-10", "2026-10-01", o), 0);
  assert.equal(workingDaysBetween("2026-10-01", "2026-10-01", o), 0);
  assert.equal(workingDaysBetween("nonsense", "2026-10-01", o), 0);
});

test("local date follows the place, not UTC: a late-evening story stays on its own day", () => {
  // 11:30 UTC on 17 Sep is 23:30 in Auckland (NZST, daylight saving starts 27 Sep) and 19:30 in Perth.
  assert.equal(localDate("2026-09-17T11:30:00Z", "NZ"), "2026-09-17");
  assert.equal(localDate("2026-09-17T12:30:00Z", "NZ"), "2026-09-18");
  assert.equal(localDate("2026-09-17T12:30:00Z", "WA"), "2026-09-17");
  assert.equal(localDate("not a date", "NZ"), null);
  assert.equal(localDate("2026-09-17", "NZ"), "2026-09-17");
});

test("in the holidays, 'this term' means the term that just ended, including across New Year", () => {
  assert.equal(latestStartedTerm("2026-10-01", "NZ")?.term, 3);
  const newYear = latestStartedTerm("2027-01-10", "NZ");
  assert.equal(newYear?.term, 4);
  assert.equal(newYear?.year, 2026);
});

test("the next term is found across New Year", () => {
  const next = currentOrNextTerm("2026-12-22", "NZ");
  assert.equal(next?.term, 1);
  assert.equal(next?.year, 2027);
});

test("coverage gaps name exactly the states missing next year's dates, once it matters", () => {
  const september = termCoverageGaps("2026-09-17").map((g) => `${g.jurisdiction}${g.year}`).sort();
  assert.deepEqual(september, ["ACT2027", "NT2027", "QLD2027", "SA2027", "TAS2027", "WA2027"]);
  assert.deepEqual(termCoverageGaps("2026-05-01"), [], "next year is not yet urgent in May");
});

test("date arithmetic is calendar arithmetic, safe across months and leap years", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(dayOfWeek("2026-09-17"), 4, "17 September 2026 is a Thursday");
});
