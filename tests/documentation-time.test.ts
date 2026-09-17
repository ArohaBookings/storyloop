import assert from "node:assert/strict";
import test from "node:test";
import { calculateDocumentationTime, EXAMPLE_INPUTS, normalizeTimeInputs } from "../lib/documentation-time";

test("the example centre: arithmetic a director can check by hand", () => {
  const result = calculateDocumentationTime(EXAMPLE_INPUTS);
  // 40 children x 2 stories = 80 stories. 80 x 30 min = 40 h. 80 x 10 min = 13.3 h.
  assert.equal(result.storiesPerMonth, 80);
  assert.equal(result.hoursNow, 40);
  assert.equal(result.hoursWithDraft, 13.3);
  assert.equal(result.hoursSaved, 26.7);
  assert.equal(result.valueSaved, 853.33);
  // 8 educators: Centre Starter NZ$109 beats 8 x NZ$21 = NZ$168.
  assert.equal(result.recommended.plan, "centre_starter");
  assert.equal(result.recommended.monthly, 109);
  assert.equal(result.breakEvenHours, 3.4);
  assert.equal(result.netMonthly, 744.33);
});

test("a very small team is pointed at the cheaper individual plan", () => {
  const result = calculateDocumentationTime(normalizeTimeInputs({ ...EXAMPLE_INPUTS, educators: 2 }));
  assert.equal(result.recommended.plan, "educator");
  assert.equal(result.recommended.monthly, 42);
});

test("team size picks the centre tier, in the chosen currency", () => {
  const eighteen = calculateDocumentationTime(normalizeTimeInputs({ ...EXAMPLE_INPUTS, educators: 18, currency: "AUD" }));
  assert.equal(eighteen.recommended.plan, "centre_growth");
  assert.equal(eighteen.recommended.monthly, 199);
  const forty = calculateDocumentationTime(normalizeTimeInputs({ ...EXAMPLE_INPUTS, educators: 40 }));
  // Beyond 25, only per-educator plans cover everyone; nothing is invented.
  assert.equal(forty.recommended.plan, "educator");
});

test("a faster 'with draft' time than the current time never produces negative savings", () => {
  const result = calculateDocumentationTime(normalizeTimeInputs({ ...EXAMPLE_INPUTS, minutesPerStoryNow: 10, minutesPerStoryWithDraft: 25 }));
  assert.equal(result.hoursSaved, 0);
  assert.equal(result.valueSaved, 0);
  assert.ok(result.netMonthly < 0, "and the page shows it does not pay for itself");
});

test("nonsense input is clamped rather than breaking the page", () => {
  const inputs = normalizeTimeInputs({ educators: "abc", children: -5, storiesPerChildPerMonth: 1e9, hourlyCost: Number.NaN, currency: "USD" });
  assert.equal(inputs.currency, "NZD");
  assert.equal(inputs.educators, EXAMPLE_INPUTS.educators);
  assert.equal(inputs.children, 1);
  assert.equal(inputs.storiesPerChildPerMonth, 30);
  assert.equal(inputs.hourlyCost, EXAMPLE_INPUTS.hourlyCost);
  assert.doesNotThrow(() => calculateDocumentationTime(inputs));
  const zeroCost = calculateDocumentationTime(normalizeTimeInputs({ ...EXAMPLE_INPUTS, hourlyCost: 0 }));
  assert.equal(zeroCost.breakEvenHours, 0);
});
