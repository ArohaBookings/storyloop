import test from "node:test";
import assert from "node:assert/strict";
import { dayLabel } from "../lib/day-label";

// 25 Nov 2026: History logged React #418 because the server (UTC) and an NZ browser printed
// different days for a story written before 1pm NZ. Before mount the label must be the UTC day.
const nineAmNz = "2026-11-24T20:00:00.000Z"; // 9am on 25 Nov in Auckland, still 24 Nov in UTC

test("prints the UTC day until the page has mounted, whatever the machine's zone", () => {
  assert.equal(dayLabel(nineAmNz, { day: "numeric", month: "short" }, false), "24 Nov");
});

test("prints the reader's own day once mounted", () => {
  const local = new Date(nineAmNz).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  assert.equal(dayLabel(nineAmNz, { day: "numeric", month: "short" }, true), local);
});

test("gives an empty string for nothing or a bad date", () => {
  assert.equal(dayLabel(null, { day: "numeric" }, false), "");
  assert.equal(dayLabel("not a date", { day: "numeric" }, true), "");
});
