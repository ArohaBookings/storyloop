import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SEO_PAGES } from "../lib/seo-pages";
import { GUIDE_PRODUCT, guidePriceLine, guideProductHasDemo } from "../lib/guide-product";
import { rivalNames } from "../lib/blog-topics";

const REAIMED = ["intentional-teaching", "observation-methods-early-childhood", "nqs-standards", "eylf-observation-examples"];

test("re-aimed guide titles fit in 60 characters and descriptions in 155", () => {
  for (const slug of REAIMED) {
    const page = SEO_PAGES[slug];
    assert.ok(page, slug);
    assert.ok(page.title.length <= 60, `${slug} title ${page.title.length}`);
    assert.ok(page.description.length <= 155, `${slug} description ${page.description.length}`);
  }
  const dedicated: Array<[string, string]> = [["app/what-is-a-learning-story/page.tsx", "What Is a Learning Story? For Educators and Parents"]];
  for (const [file, title] of dedicated) {
    assert.ok(readFileSync(new URL(`../${file}`, import.meta.url), "utf8").includes(title));
    assert.ok(title.length <= 60);
  }
});

test("no two guide pages share a title", () => {
  const seen = new Map<string, string>();
  for (const page of Object.values(SEO_PAGES)) {
    const key = page.title.toLowerCase();
    assert.ok(!seen.has(key), `${page.slug} and ${seen.get(key)} share "${page.title}"`);
    seen.set(key, page.slug);
  }
});

test("the product block names no other product, uses no em dash, and claims no anecdotal or running record", () => {
  for (const [slug, entry] of Object.entries(GUIDE_PRODUCT)) {
    const words = JSON.stringify(entry);
    assert.deepEqual(rivalNames(words), [], slug);
    assert.ok(!words.includes("—"), slug);
    assert.doesNotMatch(words, /anecdotal|running record/i, slug);
    assert.doesNotMatch(words, /checked against (this|your) policy/i, slug);
  }
  // Ruling C3(b): the leader sees the stories her team shares, not every story.
  const nqs = GUIDE_PRODUCT["nqs-standards"];
  assert.equal(nqs.kind, "leader");
  assert.match(nqs.kind === "leader" ? nqs.text : "", /sees the stories her team shares in one place/);
});

test("a page with the note box in the block gives it the try anchor and drops its second box", () => {
  const block = readFileSync(new URL("../components/marketing/GuideProductBlock.tsx", import.meta.url), "utf8");
  assert.match(block, /id="try"/);
  const slugPage = readFileSync(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(slugPage, /withTry=\{!productHero && !productBlockDemo\}/);
  assert.ok(guideProductHasDemo("intentional-teaching"));
  assert.ok(!guideProductHasDemo("nqs-standards"));
  const template = readFileSync(new URL("../app/learning-story-template/page.tsx", import.meta.url), "utf8");
  assert.match(template, /withTry=\{false\}/);
});

test("the price line comes from the plans and says the free allowance once", () => {
  assert.equal(guidePriceLine("visitor"), "Free for 3 stories a month, no card. Educator NZ$21 or A$19 a month.");
  assert.equal(guidePriceLine("AU", { freeSaid: true }), "No card for the free stories. Unlimited is A$19 a month.");
});

test("each owned sentence appears once in the code", () => {
  const sources = [
    "lib/guide-product.ts",
    "lib/answer-blocks.ts",
    "lib/seo-pages.ts",
    "lib/seo-pages-2026-10.ts",
    "app/learning-story-template/page.tsx",
    "app/te-whariki-learning-outcomes-guide/page.tsx",
  ].map((file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
  for (const entry of Object.values(GUIDE_PRODUCT)) {
    if (entry.kind === "leader" || !entry.ownedSentence) continue;
    const count = sources.reduce((sum, text) => sum + text.split(entry.ownedSentence!).length - 1, 0);
    assert.equal(count, 1, entry.ownedSentence);
  }
});
