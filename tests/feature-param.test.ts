import assert from "node:assert/strict";
import test from "node:test";
import { resolveFeatureParam } from "../lib/plans";

test("upgrade links resolve whether they use the key or a hyphenated name", () => {
  assert.equal(resolveFeatureParam("storyAssistant"), "storyAssistant");
  assert.equal(resolveFeatureParam("unlimitedTodayLoop"), "unlimitedTodayLoop");
  // Every hyphenated link that exists in the app today.
  assert.equal(resolveFeatureParam("director-roi-dashboard"), "directorRoiDashboard");
  assert.equal(resolveFeatureParam("centre-quality-calibration"), "centreQualityCalibration");
  assert.equal(resolveFeatureParam("family-reply-loop"), "familyReplyLoop");
  assert.equal(resolveFeatureParam("observation-coach"), "observationCoach");
  assert.equal(resolveFeatureParam("quiet-child-radar"), "quietChildRadar");
  assert.equal(resolveFeatureParam("transition-pack"), "transitionPack");
  assert.equal(resolveFeatureParam("reliever-brief"), "relieverBrief");
  // Short names that differ from the key.
  assert.equal(resolveFeatureParam("child-continuity"), "childContinuityProfiles");
  assert.equal(resolveFeatureParam("term-report"), "termWeather");
});

test("anything that is not a feature resolves to nothing", () => {
  assert.equal(resolveFeatureParam(null), null);
  assert.equal(resolveFeatureParam(undefined), null);
  assert.equal(resolveFeatureParam(""), null);
  assert.equal(resolveFeatureParam("made-up-feature"), null);
  assert.equal(resolveFeatureParam("constructor"), null);
  assert.equal(resolveFeatureParam("__proto__"), null);
  assert.equal(resolveFeatureParam("toString"), null);
});
