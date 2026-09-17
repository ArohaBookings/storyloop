import assert from "node:assert/strict";
import test from "node:test";
import {
  apiCostUsd,
  breakEvenStories,
  calibrateFromInvoice,
  computeEconomics,
  customerContribution,
  projectAtScale,
  weightedCalls,
  type EconomicsInput,
} from "../lib/economics";

const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);

const base: EconomicsInput = {
  mrrNzd: 126,
  payingCustomers: 8,
  counts: { stories: 300, demos: 40, assistantEdits: 120 },
  costsUsd: { story: 0.04, demo: 0.04, assistant: 0.003 },
  nzdPerUsd: 1.7,
  fixedMonthlyNzd: 40,
  paymentFeeRate: 0.035,
};

test("calibration splits an invoice so the parts sum back to the invoice exactly", () => {
  const counts = { stories: 300, demos: 40, assistantEdits: 120 };
  const costs = calibrateFromInvoice(18.5, counts);
  assert.ok(costs);
  close(apiCostUsd(counts, costs), 18.5, 1e-9);
});

test("calibration refuses to invent a rate when there is nothing to divide", () => {
  assert.equal(calibrateFromInvoice(20, { stories: 0, demos: 0, assistantEdits: 0 }), null);
  assert.equal(calibrateFromInvoice(0, { stories: 10, demos: 0, assistantEdits: 0 }), null);
  assert.equal(calibrateFromInvoice(-5, { stories: 10, demos: 0, assistantEdits: 0 }), null);
});

test("weighted volume counts a Quill edit as a fraction of a story", () => {
  close(weightedCalls({ stories: 10, demos: 0, assistantEdits: 100 }), 10 + 100 * 0.08);
});

test("economics add up: revenue minus every cost equals gross profit", () => {
  const e = computeEconomics(base);
  close(e.apiCostNzd, (300 * 0.04 + 40 * 0.04 + 120 * 0.003) * 1.7);
  close(e.paymentFeesNzd, 126 * 0.035);
  close(e.totalCostNzd, e.apiCostNzd + e.paymentFeesNzd + 40);
  close(e.grossProfitNzd, 126 - e.totalCostNzd);
  assert.ok(e.grossMarginPct !== null);
  close(e.grossMarginPct, (e.grossProfitNzd / 126) * 100);
});

test("no revenue gives no margin rather than a divide-by-zero", () => {
  const e = computeEconomics({ ...base, mrrNzd: 0, payingCustomers: 0 });
  assert.equal(e.grossMarginPct, null);
  assert.equal(e.apiShareOfRevenuePct, null);
  assert.equal(e.revenuePerPayingCustomerNzd, null);
  assert.equal(e.apiCostPerPayingCustomerNzd, null);
});

test("garbage inputs cannot produce NaN in a figure the operator reads", () => {
  const e = computeEconomics({
    ...base,
    mrrNzd: Number.NaN,
    nzdPerUsd: Number.NaN,
    fixedMonthlyNzd: -100,
    counts: { stories: Number.NaN, demos: -3, assistantEdits: Number.POSITIVE_INFINITY },
  });
  for (const [key, value] of Object.entries(e)) {
    if (value === null) continue;
    assert.ok(Number.isFinite(value), `${key} was ${value}`);
  }
});

test("scale projection holds fixed costs flat, so margin improves with growth", () => {
  const [one, ten, hundred] = projectAtScale(base, [1, 10, 100]);
  assert.ok(ten.grossMarginPct !== null && one.grossMarginPct !== null && hundred.grossMarginPct !== null);
  assert.ok(ten.grossMarginPct > one.grossMarginPct);
  assert.ok(hundred.grossMarginPct >= ten.grossMarginPct);
  close(ten.fixedNzd, one.fixedNzd);
  close(ten.apiCostNzd, one.apiCostNzd * 10, 1e-6);
});

test("contribution flags a paying customer who costs more than they pay, and never a free one", () => {
  const rows = customerContribution(
    [
      { userId: "heavy", email: "a", planPriceNzd: 21, stories30d: 400, assistantEdits30d: 0 },
      { userId: "light", email: "b", planPriceNzd: 21, stories30d: 10, assistantEdits30d: 5 },
      { userId: "free", email: "c", planPriceNzd: 0, stories30d: 3, assistantEdits30d: 0 },
    ],
    { story: 0.04, demo: 0.04, assistant: 0.003 },
    1.7,
  );
  assert.equal(rows[0].userId, "heavy", "sorted worst contribution first");
  assert.equal(rows.find((r) => r.userId === "heavy")?.unprofitable, true);
  assert.equal(rows.find((r) => r.userId === "light")?.unprofitable, false);
  assert.equal(rows.find((r) => r.userId === "free")?.unprofitable, false);
});

test("break-even stories: how much a user can write before they cost more than they pay", () => {
  // NZ$21 plan, US$0.04 a story at 1.7 = NZ$0.068 a story -> 308 stories.
  assert.equal(breakEvenStories(21, 0.04, 1.7), 308);
  assert.equal(breakEvenStories(21, 0, 1.7), null);
});
