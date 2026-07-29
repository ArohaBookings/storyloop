import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowWhatsNew, WHATS_NEW_VERSION } from "../lib/whats-new";

test("What's New appears once per user and stays dismissed across releases", () => {
  assert.equal(shouldShowWhatsNew(null), true);
  assert.equal(shouldShowWhatsNew(undefined), true);
  assert.equal(shouldShowWhatsNew(WHATS_NEW_VERSION), false);
  assert.equal(shouldShowWhatsNew("an-older-release"), false);
});
