import assert from "node:assert/strict";
import test from "node:test";
import { effectiveConsent, parseRegion, regionForCountry } from "../lib/analytics/consent-region";

test("NZ and Australia (and the rest of the world) are not asked; the EU, EEA, UK and Switzerland are", () => {
  for (const country of ["NZ", "AU", "US", "CA", "SG", "nz", " au "]) assert.equal(regionForCountry(country), "open", country);
  for (const country of ["GB", "IE", "DE", "FR", "NL", "SE", "PL", "NO", "IS", "LI", "CH", "CY", "MT", "gb"]) assert.equal(regionForCountry(country), "ask", country);
});

test("an unknown or malformed country is asked (the careful default)", () => {
  for (const country of [null, undefined, "", "XX1", "N", "NZL", "--"]) assert.equal(regionForCountry(country), "ask", String(country));
});

test("only an exact 'open' cookie opens; anything else asks", () => {
  assert.equal(parseRegion("open"), "open");
  for (const value of ["ask", "", null, undefined, "OPEN", "open "]) assert.equal(parseRegion(value), "ask", String(value));
});

test("an explicit choice always wins, in either region", () => {
  for (const region of ["ask", "open"] as const) {
    for (const privacySignal of [true, false]) {
      assert.equal(effectiveConsent({ explicit: "essential", region, privacySignal }), "essential");
      assert.equal(effectiveConsent({ explicit: "all", region, privacySignal }), "all");
    }
  }
});

test("no choice: Global Privacy Control means essential; open region means all; ask region means not yet", () => {
  assert.equal(effectiveConsent({ explicit: null, region: "open", privacySignal: true }), "essential");
  assert.equal(effectiveConsent({ explicit: null, region: "ask", privacySignal: true }), "essential");
  assert.equal(effectiveConsent({ explicit: null, region: "open", privacySignal: false }), "all");
  assert.equal(effectiveConsent({ explicit: null, region: "ask", privacySignal: false }), null);
  assert.equal(effectiveConsent({ explicit: undefined, region: "ask", privacySignal: false }), null);
});
