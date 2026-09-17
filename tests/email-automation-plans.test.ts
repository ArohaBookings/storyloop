import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_ORDER } from "../lib/plans";
import { CENTRE_PLAN_KEYS, PAID_PLAN_KEYS } from "../lib/email/automation";

test("lifecycle rules for paying customers include every paid plan", () => {
  for (const plan of PLAN_ORDER.filter((p) => p !== "free")) {
    assert.ok(PAID_PLAN_KEYS.includes(plan), `${plan} would be skipped by paid-customer emails`);
  }
  assert.ok(!PAID_PLAN_KEYS.includes("free"));
});

test("centre-only emails reach both centre tiers and nobody else", () => {
  for (const plan of PLAN_ORDER) {
    assert.equal(CENTRE_PLAN_KEYS.includes(plan), plan.startsWith("centre_"), plan);
  }
});
