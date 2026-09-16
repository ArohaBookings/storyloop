import assert from "node:assert/strict";
import test from "node:test";
import { formatAmount, formatDate } from "../lib/email/billing";

/**
 * These two functions produce the only numbers a customer reads in a receipt.
 * Getting a cents/dollars conversion wrong would bill someone NZ$2100.00 in
 * writing for a NZ$21.00 charge, so they are pinned here.
 */

test("amounts convert from cents and carry the right currency prefix", () => {
  assert.equal(formatAmount(2100, "nzd"), "NZ$21.00");
  assert.equal(formatAmount(1900, "aud"), "A$19.00");
  assert.equal(formatAmount(2900, "AUD"), "A$29.00");
  assert.equal(formatAmount(1599, "usd"), "US$15.99");
});

test("an unknown currency still renders readably rather than lying about it", () => {
  assert.equal(formatAmount(1000, "gbp"), "GBP 10.00");
});

test("currency defaults to NZD when Stripe omits it", () => {
  assert.equal(formatAmount(2100, null), "NZ$21.00");
  assert.equal(formatAmount(2100, undefined), "NZ$21.00");
});

test("amounts that are not real numbers return null instead of NaN", () => {
  assert.equal(formatAmount(null, "nzd"), null);
  assert.equal(formatAmount(undefined, "nzd"), null);
  assert.equal(formatAmount(Number.NaN, "nzd"), null);
  assert.equal(formatAmount(Number.POSITIVE_INFINITY, "nzd"), null);
});

test("a zero invoice still formats, so the caller decides whether to send", () => {
  // The zero-amount decision belongs in sendBillingEmail, not here: a trial
  // starting is a real event, it is just not a payment worth thanking someone
  // for. Formatting must not quietly swallow it.
  assert.equal(formatAmount(0, "nzd"), "NZ$0.00");
});

test("rounding does not drop a cent", () => {
  assert.equal(formatAmount(2199, "nzd"), "NZ$21.99");
  assert.equal(formatAmount(1, "nzd"), "NZ$0.01");
  assert.equal(formatAmount(21900, "nzd"), "NZ$219.00");
});

test("dates render the way an educator reads them, not as a unix timestamp", () => {
  // 2026-10-14T00:00:00Z
  const formatted = formatDate(1791244800);
  assert.ok(formatted, "expected a formatted date");
  assert.match(formatted, /2026/);
  assert.match(formatted, /October/);
});

test("missing or invalid dates return null rather than 'Invalid Date'", () => {
  assert.equal(formatDate(null), null);
  assert.equal(formatDate(undefined), null);
  assert.equal(formatDate(Number.NaN), null);
});
