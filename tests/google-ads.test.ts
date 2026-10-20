import assert from "node:assert/strict";
import test from "node:test";
import { adsConsentFor, GOOGLE_ADS_ID, PAID_SEND_TO, SIGNUP_SEND_TO } from "../lib/analytics/google-ads";

test("Google Ads cookies only with an explicit Allow; personalisation and Google Analytics never", () => {
  assert.deepEqual(adsConsentFor("all"), { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied", analytics_storage: "denied" });
  for (const choice of ["essential", null] as const) {
    assert.deepEqual(adsConsentFor(choice), { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
  }
});

test("conversion targets belong to the StoryLoop Ads account", () => {
  assert.match(GOOGLE_ADS_ID, /^AW-\d{8,12}$/);
  assert.ok(SIGNUP_SEND_TO.startsWith(`${GOOGLE_ADS_ID}/`));
  assert.ok(PAID_SEND_TO.startsWith(`${GOOGLE_ADS_ID}/`));
  assert.notEqual(SIGNUP_SEND_TO, PAID_SEND_TO);
});
