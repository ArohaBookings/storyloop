import assert from "node:assert/strict";
import test from "node:test";
import { navItemVisible } from "../lib/nav-visibility";

test("unlocked items are always shown", () => {
  assert.equal(navItemVisible("free"), true);
  assert.equal(navItemVisible("free", "coreStories"), true);
  assert.equal(navItemVisible("centre_growth", "wallCards"), true);
});

test("an individual plan sees the individual features it lacks, as the way to find them", () => {
  assert.equal(navItemVisible("free", "wallCards"), true);
  assert.equal(navItemVisible("free", "childVoice"), true);
  assert.equal(navItemVisible("educator", "quietChildRadar"), true, "Pro is one step up");
});

test("an individual plan does not see a wall of padlocks for team tools", () => {
  for (const plan of ["free", "educator", "educator_pro"] as const) {
    for (const feature of ["planningBoard", "relieverBrief", "evidencePack", "adminOversight", "directorRoiDashboard"] as const) {
      assert.equal(navItemVisible(plan, feature), false, `${plan} should not see ${feature}`);
    }
  }
});

test("a centre plan sees the centre feature above it", () => {
  assert.equal(navItemVisible("centre_starter", "directorRoiDashboard"), true);
  assert.equal(navItemVisible("centre_starter", "evidencePack"), true);
});
