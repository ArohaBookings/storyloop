import assert from "node:assert/strict";
import test from "node:test";
import { isMissingTermSettingsColumn, parseTermSettings, validateTermSettingsUpdate } from "../lib/term-settings";

test("an unconfigured service is assumed NOT to follow terms, so no holiday can hide a quiet child", () => {
  for (const raw of [undefined, null, {}, "garbage", 42]) {
    const s = parseTermSettings(raw, "AU");
    assert.equal(s.followsSchoolTerms, false);
    assert.equal(s.configured, false);
  }
});

test("New Zealand has one calendar, so the framework is enough; Australia must choose a state", () => {
  assert.equal(parseTermSettings({}, "NZ").jurisdiction, "NZ");
  assert.equal(parseTermSettings({}, "AU").configured, false);
});

test("a saved choice is honoured exactly", () => {
  assert.deepEqual(parseTermSettings({ jurisdiction: "WA", followsSchoolTerms: true }, "AU"), {
    jurisdiction: "WA", followsSchoolTerms: true, configured: true,
  });
});

test("followsSchoolTerms must be literally true; truthy strings do not switch holidays on", () => {
  assert.equal(parseTermSettings({ jurisdiction: "VIC", followsSchoolTerms: "yes" }).followsSchoolTerms, false);
  assert.equal(parseTermSettings({ jurisdiction: "VIC", followsSchoolTerms: 1 }).followsSchoolTerms, false);
});

test("updates from the browser are validated strictly", () => {
  assert.deepEqual(validateTermSettingsUpdate({ jurisdiction: "QLD", followsSchoolTerms: false }), { jurisdiction: "QLD", followsSchoolTerms: false });
  assert.equal(validateTermSettingsUpdate({ jurisdiction: "London", followsSchoolTerms: true }), null);
  assert.equal(validateTermSettingsUpdate({ jurisdiction: "NZ", followsSchoolTerms: "true" }), null);
  assert.equal(validateTermSettingsUpdate({ jurisdiction: "NZ" }), null);
  assert.equal(validateTermSettingsUpdate(null), null);
});

test("a missing column before the migration is recognised, not treated as a real failure", () => {
  assert.equal(isMissingTermSettingsColumn({ code: "42703", message: "column profiles.term_settings does not exist" }), true);
  assert.equal(isMissingTermSettingsColumn({ message: "column profiles.term_settings does not exist" }), true);
  assert.equal(isMissingTermSettingsColumn({ message: "permission denied" }), false);
  assert.equal(isMissingTermSettingsColumn(null), false);
});
