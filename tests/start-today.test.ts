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

// Review fixes, 25 Nov (R1-1, R1-2, R4-5).
import { startTodayState, wallPayPath, startTodayPlanName } from "../lib/start-today";

const day = 86_400;
const freeWeek = { id: "sub_1", status: "trialing", metadata: { plan: "educator" }, trial_start: 1_000_000, trial_end: 1_000_000 + 7 * day };

test("only a truly free account is sent to checkout from the statement wall (R1-1)", () => {
  assert.equal(startTodayState({ ...profile, subscription_status: "free", plan: "free", stripe_subscription_id: null }, null), "free");
  assert.equal(startTodayState(profile, freeWeek), "eligible");
  assert.equal(startTodayState(profile, "error"), "failed", "Stripe did not answer: never checkout");
  assert.equal(startTodayState(profile, { ...freeWeek, status: "active" }), "already_paying", "the profile says trialing, Stripe says active");
  assert.equal(startTodayState({ ...profile, subscription_status: "active" }, { ...freeWeek, status: "active" }), "already_paying");
  assert.equal(wallPayPath("free"), "checkout");
  assert.equal(wallPayPath("eligible"), "start_today");
  for (const code of ["failed", "already_paying", "long_trial", "not_eligible"] as const) assert.equal(wallPayPath(code), "billing", code);
});

test("the free month of Educator Pro is not the free week: no start today (R1-2)", () => {
  const proMonth = { ...freeWeek, metadata: { plan: "educator_pro", offer_id: "pro_free_month_2026_10" }, trial_end: freeWeek.trial_start + 30 * day };
  assert.equal(canStartToday({ ...profile, plan: "educator_pro" }, proMonth), false);
  assert.equal(startTodayState({ ...profile, plan: "educator_pro" }, proMonth), "long_trial");
  assert.equal(canStartToday(profile, { ...freeWeek, trial_end: freeWeek.trial_start + 30 * day }), false, "any trial longer than a week");
  assert.equal(canStartToday(profile, freeWeek), true);
});

test("the wall names the plan she is on (R4-5)", () => {
  assert.equal(startTodayPlanName({ ...freeWeek, metadata: { plan: "educator_pro" } }), "Educator Pro");
  assert.equal(startTodayPlanName(freeWeek), "Educator");
  assert.equal(startTodayPlanName({ ...freeWeek, metadata: {} }), "Educator");
});

test("the wall never sends a subscribed account to checkout, and checkout refuses it (R1-1, R1-4)", async () => {
  const { readFileSync } = await import("node:fs");
  const wall = readFileSync("components/app/AppLimitWall.tsx", "utf8");
  assert.match(wall, /billing: data\?\.code !== "free"/);
  assert.match(wall, /disabled=\{!todayLine \|\| billingOnly/);
  assert.doesNotMatch(wall, /hostedInvoiceUrl/, "a needs-action answer keeps her on the page with her notes");
  const route = readFileSync("app/api/stripe/start-today/route.ts", "utf8");
  assert.doesNotMatch(route, /invoices\.list/);
  const checkout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(checkout, /if \(paysToday && hasLiveStripeSubscription\(profile\)\)/);
});

test("the paid wall line matches the paid daily limit (R4-4)", async () => {
  const { readFileSync } = await import("node:fs");
  const wall = readFileSync("components/app/AppLimitWall.tsx", "utf8");
  const limit = Number(/STATEMENT_PAID_LIMIT = (\d+)/.exec(readFileSync("lib/child-statement.ts", "utf8"))?.[1]);
  assert.match(wall, new RegExp(`Educator covers up to ${limit} a day\\.`));
  assert.doesNotMatch(wall, /as many as you need/);
});
