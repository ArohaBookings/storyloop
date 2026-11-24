import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { isLiveStatus, startFreeCentreName, startFreeDecision, startFreeTrialEnd } from "../lib/centre-start";

const base = { switchOn: true, inCentre: false, hasLiveSub: false, liveSubIsCentre: false, hadCentreBefore: false };

test("every startFreeDecision branch", () => {
  assert.equal(startFreeDecision(base), "start");
  assert.equal(startFreeDecision({ ...base, switchOn: false }), "needs_checkout", "switch off: today's checkout");
  assert.equal(startFreeDecision({ ...base, inCentre: true }), "already");
  assert.equal(startFreeDecision({ ...base, hasLiveSub: true, liveSubIsCentre: true }), "already");
  assert.equal(startFreeDecision({ ...base, hasLiveSub: true }), "needs_checkout", "a leader who pays as an individual: today's path");
  assert.equal(startFreeDecision({ ...base, hadCentreBefore: true }), "needs_checkout", "one free period per centre");
  assert.equal(isLiveStatus("trialing"), true);
  assert.equal(isLiveStatus("canceled"), false);
  assert.equal(isLiveStatus("free"), false);
});

test("free until the end of 31 January 2027 NZ time before the cutoff, 30 days after", () => {
  assert.equal(startFreeTrialEnd(new Date("2026-11-25T03:00:00Z")).toISOString(), new Date("2027-01-31T23:59:59+13:00").toISOString());
  const later = new Date("2027-02-10T00:00:00Z");
  assert.equal(startFreeTrialEnd(later).getTime() - later.getTime(), 30 * 86_400_000);
});

test("the centre's name: typed, else the one on the educator's link, else asked on /centre", () => {
  assert.equal(startFreeCentreName("  Kowhai Kindergarten ", "Other"), "Kowhai Kindergarten");
  assert.equal(startFreeCentreName("", "Rimu Kids"), "Rimu Kids");
  assert.equal(startFreeCentreName(undefined, null), null);
  assert.equal(startFreeCentreName("a", null), null);
});

test("CENTRE_START_NO_CHECKOUT off: the route sends everyone to checkout, nobody joins, signup uses checkout", () => {
  const route = readFileSync("app/api/centres/start-free/route.ts", "utf8");
  assert.match(route, /if \(!CENTRE_START_NO_CHECKOUT\) return needsCheckout\(\);/);
  assert.match(readFileSync("app/api/centres/route.ts", "utf8"), /if \(CENTRE_START_NO_CHECKOUT\) await joinFromLeaderOffer\(user\.id, centre\.id\);/);
  assert.match(readFileSync("lib/centre-start-client.ts", "utf8"), /if \(!CENTRE_START_NO_CHECKOUT \|\| !isCentrePlan\(input\.plan\)\) return checkout\(\);/);
  assert.match(readFileSync("app/(auth)/signup/SignupForm.tsx", "utf8"), /\? CENTRE_START_NO_CHECKOUT\s*\? "Your centre starts free now\. No card needed, and no payment page\."\s*: "Then confirm the centre plan\. No card needed\."/);
  // The API-made subscription carries checkout's metadata keys, and a double tap makes one.
  for (const key of ["app:", "user_id:", "plan,", "currency,", "founding_centre:", "trial_days:", "trial_end:", "no_card:", 'source: "start_free"']) assert.ok(route.includes(key), key);
  assert.match(route, /idempotencyKey: `start-free-\$\{user\.id\}/);
  assert.match(route, /missing_payment_method: "cancel"/);
});
