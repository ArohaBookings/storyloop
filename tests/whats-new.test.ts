import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowWhatsNew, whatsNewIsFresh, WHATS_NEW_MIN_STORIES, WHATS_NEW_PUBLISHED, WHATS_NEW_SHOW_DAYS, WHATS_NEW_VERSION, WHATS_NEW_ITEMS } from "../lib/whats-new";

// A moment while the current notes are still news.
const FRESH = new Date(Date.parse(`${WHATS_NEW_PUBLISHED}T12:00:00+12:00`) + 86_400_000);

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
  assert.equal(shouldShowWhatsNew(null, 0, FRESH), false);
  assert.equal(shouldShowWhatsNew(undefined, 0, FRESH), false);
  assert.equal(shouldShowWhatsNew("2026-07", 0, FRESH), false);
  // Not even to a brand-new account that has somehow never seen any version.
  assert.equal(shouldShowWhatsNew(null, WHATS_NEW_MIN_STORIES - 1, FRESH), false);
});

test("an educator who has used it, and not seen this release, is shown it once", () => {
  assert.equal(shouldShowWhatsNew(null, WHATS_NEW_MIN_STORIES, FRESH), true);
  assert.equal(shouldShowWhatsNew("2026-07", 12, FRESH), true, "an older release counts as unseen");
  assert.equal(shouldShowWhatsNew(WHATS_NEW_VERSION, 12, FRESH), false, "and never twice");
});

test("old notes are never shown, however long someone has been away (Leo, 28 Oct 2026)", () => {
  const published = Date.parse(`${WHATS_NEW_PUBLISHED}T00:00:00+12:00`);
  assert.ok(!Number.isNaN(published), "WHATS_NEW_PUBLISHED must be a real date");
  const lastDay = new Date(published + (WHATS_NEW_SHOW_DAYS - 1) * 86_400_000 + 3_600_000);
  const stale = new Date(published + WHATS_NEW_SHOW_DAYS * 86_400_000 + 60_000);
  assert.equal(shouldShowWhatsNew(null, 12, lastDay), true, "still news on the last day");
  assert.equal(shouldShowWhatsNew(null, 12, stale), false, "never after the window");
  assert.equal(shouldShowWhatsNew("2026-07", 12, stale), false, "not even to someone who saw an older release");
  assert.equal(shouldShowWhatsNew(null, 12, new Date(published - 3_600_000)), false, "nor before it was published");
  assert.equal(whatsNewIsFresh(stale), false);
  // The October 2026 notes (published 23 Sep) are old news by late October.
  assert.equal(shouldShowWhatsNew(null, 12, new Date("2026-10-28T12:00:00+13:00")), false);
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
