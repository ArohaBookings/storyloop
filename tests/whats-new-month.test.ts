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
