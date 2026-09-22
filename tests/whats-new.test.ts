import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowWhatsNew, WHATS_NEW_MIN_STORIES, WHATS_NEW_VERSION, WHATS_NEW_ITEMS } from "../lib/whats-new";

/**
 * The card was disabled outright on 2026-09-16: it fired for every user who had
 * never dismissed it, putting a modal in front of a new educator before they
 * had written anything, on the exact funnel step that matters most.
 *
 * It is on again for the September 2026 release, with that lesson kept as a
 * rule rather than a memory. These tests pin the rule, so a future release that
 * bumps the version cannot quietly reintroduce the original mistake.
 */

test("nothing is ever shown to somebody who has not written a story yet", () => {
  assert.equal(shouldShowWhatsNew(null, 0), false);
  assert.equal(shouldShowWhatsNew(undefined, 0), false);
  assert.equal(shouldShowWhatsNew("2026-07", 0), false);
  // Not even to a brand-new account that has somehow never seen any version.
  assert.equal(shouldShowWhatsNew(null, WHATS_NEW_MIN_STORIES - 1), false);
});

test("an educator who has used it, and not seen this release, is shown it once", () => {
  assert.equal(shouldShowWhatsNew(null, WHATS_NEW_MIN_STORIES), true);
  assert.equal(shouldShowWhatsNew("2026-07", 12), true, "an older release counts as unseen");
  assert.equal(shouldShowWhatsNew(WHATS_NEW_VERSION, 12), false, "and never twice");
});

test("release notes describe this release only, not an accumulating changelog", () => {
  assert.ok(WHATS_NEW_ITEMS.length > 0 && WHATS_NEW_ITEMS.length <= 8, `${WHATS_NEW_ITEMS.length} items is too many to read in a modal`);
  for (const item of WHATS_NEW_ITEMS) {
    assert.ok(item.title.trim().length > 0, "every item needs a title");
    assert.ok(item.body.trim().length > 0, "every item needs a body");
    assert.ok(item.body.length <= 320, `${item.title} is too long for a card: ${item.body.length} characters`);
    if (item.href) assert.ok(item.href.startsWith("/"), `${item.title} must link somewhere in the app`);
  }
  // Nothing from the releases before this one survived.
  const text = JSON.stringify(WHATS_NEW_ITEMS);
  for (const gone of ["Today Loop", "Quill", "Documentation Radar", "Reviews you control"]) {
    assert.ok(!text.includes(gone), `${gone} is from an older release and should have been cleared out`);
  }
});

test("the centre referral is described as what it actually pays", () => {
  const referral = WHATS_NEW_ITEMS.find((item) => /centre on board/i.test(item.title));
  assert.ok(referral, "the referral offer must be in the release notes");
  assert.match(referral!.body, /three months of your own plan/i);
  // The thing an educator on the free plan most needs to know, since that is
  // the case that used to pay nothing at all.
  assert.match(referral!.body, /held for you/i);
});
