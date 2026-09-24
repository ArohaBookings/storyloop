import assert from "node:assert/strict";
import test from "node:test";
import { FEATURE_CATALOGUE, NOT_YET_BUILT } from "../lib/feature-catalogue";
import { ALL_FEATURE_KEYS } from "../lib/plans";

test("the features page lists every feature, once", () => {
  const listed = FEATURE_CATALOGUE.flatMap((group) => group.items.map((item) => item.key)).filter(Boolean);
  const missing = ALL_FEATURE_KEYS.filter((key) => !listed.includes(key) && !NOT_YET_BUILT.includes(key));
  assert.ok(NOT_YET_BUILT.every((key) => !listed.includes(key)), "a feature marked not yet built is being advertised");
  assert.deepEqual(missing, [], `features missing from lib/feature-catalogue.ts: ${missing.join(", ")}`);
  assert.equal(new Set(listed).size, listed.length, "a feature is listed twice");
});
