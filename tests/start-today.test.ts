import assert from "node:assert/strict";
import test from "node:test";
import { canStartToday, currencyFromStripe, startTodayFailure, startTodayLine, statementPlanStartedFromCheckout, STATEMENT_WALL_KEY } from "../lib/start-today";

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

test("a free account's statement-wall checkout counts as statement_plan_started when it completes", () => {
  assert.equal(STATEMENT_WALL_KEY, "statement_wall");
  assert.deepEqual(
    statementPlanStartedFromCheckout({ metadata: { app: "storyloop", plan: "educator", currency: "NZD", statement_wall: "true" }, amount_total: 2100 }),
    { from: "free", currency: "NZD", amount_cents: 2100 },
  );
  assert.deepEqual(
    statementPlanStartedFromCheckout({ metadata: { statement_wall: "true" }, amount_total: 950, currency: "aud" }),
    { from: "free", currency: "AUD", amount_cents: 950 },
    "currency from Stripe when the metadata lacks it",
  );
  assert.equal(statementPlanStartedFromCheckout({ metadata: { app: "storyloop", plan: "educator", currency: "NZD" }, amount_total: 0 }), null, "the story wall's free-week checkout is not counted");
  assert.equal(statementPlanStartedFromCheckout({ metadata: null, amount_total: 2100 }), null, "another business's checkout");
  assert.equal(statementPlanStartedFromCheckout({ metadata: { statement_wall: "false" } }), null);
});

test("checkout marks only the statement wall's pay-today checkout, and the webhook reads that mark", async () => {
  const { readFileSync } = await import("node:fs");
  const checkout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(checkout, /\.\.\.\(paysToday \? \{ \[STATEMENT_WALL_KEY\]: "true" \} : \{\}\)/);
  assert.match(checkout, /const terms = paysToday \? \{ \.\.\.baseTerms, trialDays: 0 \} : baseTerms;/);
  const webhook = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  assert.match(webhook, /statementPlanStartedFromCheckout\(session\)/);
  assert.match(webhook, /event: "statement_plan_started"/);
});
