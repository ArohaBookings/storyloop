import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SEO_PAGES } from "../lib/seo-pages";
import { fillOfferText } from "../lib/offer-wording";

// MERGE2 2e (25 Nov 2026): two sentences that were not true on the product.

test("/faq: a centre plan starts free until 31 January, then 30 days free, with no card; never a 7-day trial", () => {
  const faq = SEO_PAGES.faq.faqs.find((item) => item.question === "What does a centre plan cost?");
  assert.ok(faq);
  assert.ok(!/7-day/.test(faq.answer));
  assert.match(fillOfferText(faq.answer, new Date("2026-11-26T00:00:00Z")), /a centre plan starts free until 31 January with no card\./);
  assert.match(fillOfferText(faq.answer, new Date("2027-02-10T00:00:00Z")), /a centre plan starts 30 days free with no card\./);
  assert.match(fillOfferText(faq.answer, new Date(), { evergreen: true }), /at least 30 days free with no card/);
});

test("/safety says what /data-sheet says: child profiles deleted by her, a single story by email", () => {
  const safety = readFileSync("app/safety/page.tsx", "utf8");
  const sheet = readFileSync("app/data-sheet/page.tsx", "utf8");
  assert.ok(!safety.includes("Delete any story or child profile yourself"));
  assert.ok(safety.includes("Delete any child profile yourself at any time. To delete a single story, email ariacareapp@gmail.com and it is deleted within 30 days."));
  assert.ok(sheet.includes("Delete any child profile yourself at any time. To delete a single story, email ariacareapp@gmail.com and it is deleted within 30 days."));
});
