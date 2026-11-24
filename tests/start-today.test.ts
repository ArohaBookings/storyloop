import assert from "node:assert/strict";
import test from "node:test";
import { canStartToday, currencyFromStripe, startTodayFailure, startTodayLine } from "../lib/start-today";

const profile = { plan: "educator", subscription_status: "trialing", stripe_subscription_id: "sub_1", applied_access_code: null };

test("only her own trialing Educator subscription can start today", () => {
  assert.equal(canStartToday(profile, { id: "sub_1", status: "trialing", metadata: { plan: "educator" } }), true);
  assert.equal(canStartToday(profile, { id: "sub_2", status: "trialing", metadata: { plan: "educator" } }), false, "another subscription");
  assert.equal(canStartToday(profile, { id: "sub_1", status: "active", metadata: { plan: "educator" } }), false, "already started: a second tap charges nothing");
  assert.equal(canStartToday({ ...profile, plan: "centre_starter" }, { id: "sub_1", status: "trialing", metadata: { plan: "centre_starter" } }), false, "centre plan refused");
  assert.equal(canStartToday(profile, { id: "sub_1", status: "trialing", metadata: { plan: "centre_growth" } }), false);
  assert.equal(canStartToday({ ...profile, subscription_status: "free", plan: "free", stripe_subscription_id: null }, null), false);
});

test("the wall's line says what today costs, as money", () => {
  assert.equal(startTodayLine(2100, 2100, "NZD"), "NZ$21 today, then NZ$21 a month.");
  assert.equal(startTodayLine(1900, 1900, "AUD"), "A$19 today, then A$19 a month.");
  assert.equal(startTodayLine(1050, 2100, "NZD"), "NZ$10.50 today, then NZ$21 a month.");
  assert.equal(startTodayLine(0, 2100, "NZD"), "Nothing today, then NZ$21 a month.");
  assert.equal(currencyFromStripe("nzd"), "NZD");
  assert.equal(currencyFromStripe("usd"), null);
});

test("card failures in plain words", () => {
  assert.equal(startTodayFailure({ type: "StripeCardError", code: "card_declined" }).code, "declined");
  assert.equal(startTodayFailure({ code: "authentication_required" }).code, "needs_action");
  assert.equal(startTodayFailure(new Error("boom")).code, "failed");
});
