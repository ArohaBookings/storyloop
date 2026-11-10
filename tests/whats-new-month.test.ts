import assert from "node:assert/strict";
import test from "node:test";
import { WHATS_NEW_VERSION, whatsNewMonth } from "../lib/whats-new";

test("the What's new card names the month its version says", () => {
  assert.equal(whatsNewMonth("2026-11b"), "November");
  assert.equal(whatsNewMonth("2026-09"), "September");
  assert.equal(whatsNewMonth("2027-01"), "January");
  assert.equal(whatsNewMonth("nonsense"), "the last few weeks");
  assert.equal(whatsNewMonth(), whatsNewMonth(WHATS_NEW_VERSION));
});

import { shouldShowWhatsNew, WHATS_NEW_PUBLISHED } from "../lib/whats-new";

test("someone who joined after the notes were published is not told what is new", () => {
  const published = Date.parse(`${WHATS_NEW_PUBLISHED}T00:00:00+12:00`);
  const during = new Date(published + 2 * 86_400_000);
  assert.equal(shouldShowWhatsNew(null, 3, during, new Date(published + 3_600_000)), false, "joined an hour after: everything is new to them");
  assert.equal(shouldShowWhatsNew(null, 3, during, new Date(published).toISOString()), false, "joined at the moment of release");
  assert.equal(shouldShowWhatsNew(null, 3, during, new Date(published - 86_400_000)), true, "joined the day before: it is news");
  assert.equal(shouldShowWhatsNew(null, 3, during, "2026-06-30T00:00:00Z"), true);
  assert.equal(shouldShowWhatsNew(null, 3, during), true, "no date given: the old behaviour");
  assert.equal(shouldShowWhatsNew(null, 3, during, "not a date"), true, "an unreadable date never hides it");
});
