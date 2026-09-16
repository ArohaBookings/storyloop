import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowWhatsNew, WHATS_NEW_VERSION, WHATS_NEW_ITEMS } from "../lib/whats-new";

/**
 * The card was disabled on 2026-09-16: it fired for every user who had never
 * dismissed it, putting a modal in front of a new educator before they had
 * written anything, on the exact funnel step we are trying to fix.
 *
 * This test now pins the OFF state deliberately, so re-enabling it has to be a
 * conscious change to both the switch and this assertion rather than something
 * that comes back by accident.
 */
test("What's New stays off for everyone while it is disabled", () => {
  assert.equal(shouldShowWhatsNew(), false);
});

test("release notes are still intact for whenever it is turned back on", () => {
  assert.ok(WHATS_NEW_VERSION.length > 0);
  assert.ok(WHATS_NEW_ITEMS.length > 0);
  for (const item of WHATS_NEW_ITEMS) {
    assert.ok(item.title.trim().length > 0, "every item needs a title");
    assert.ok(item.body.trim().length > 0, "every item needs a body");
  }
});
