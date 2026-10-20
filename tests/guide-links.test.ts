import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { RELATED } from "../components/marketing/Guide";
import { PRINTABLES } from "../lib/printables";
import { DEFAULT_RELATED, SLUG_PRINTABLES, SLUG_RELATED, relatedFor } from "../components/marketing/guide-links";
import { DEDICATED_ROUTE_SLUGS, SEO_PAGES, SEO_PAGE_SLUGS } from "../lib/seo-pages";

// A guide whose search title promises a free printable must actually offer it,
// every printable must be a real one-page PDF that is in the sitemap, and every
// "keep reading" link must go to a page that exists.

const guideSlugs = new Set(SEO_PAGE_SLUGS.filter((slug) => !DEDICATED_ROUTE_SLUGS.has(slug)));

function routeExists(href: string) {
  const path = href.replace(/^\//, "").split("#")[0];
  if (path.startsWith("blog/")) return true; // blog posts live in the database
  return guideSlugs.has(path) || existsSync(`app/${path}/page.tsx`);
}

test("every printable is a real PDF with a preview, listed in the sitemap", () => {
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  for (const [key, printable] of Object.entries(PRINTABLES)) {
    const pdf = readFileSync(`public${printable.href}`);
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", `${key} is not a PDF`);
    assert.equal(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length, 1, `${key} should be one page`);
    assert.ok(existsSync(`public${printable.preview}`), `${key} preview missing`);
    assert.ok(sitemap.includes(`"${printable.href.slice(1)}"`), `${key} PDF missing from the sitemap`);
    assert.ok(printable.alt.length > 30 && printable.title.length > 10);
  }
});

test("printables and related links are only set for real guides", () => {
  for (const slug of [...Object.keys(SLUG_PRINTABLES), ...Object.keys(SLUG_RELATED)]) {
    assert.ok(guideSlugs.has(slug), `${slug} is not a guide served by app/[slug]`);
  }
  for (const keys of Object.values(SLUG_PRINTABLES)) {
    for (const key of keys) assert.ok(key in PRINTABLES, `unknown printable ${key}`);
  }
});

test("every related link goes to a page that exists", () => {
  for (const [key, link] of Object.entries(RELATED)) {
    assert.ok(routeExists(link.href), `RELATED.${key} points at a missing page: ${link.href}`);
    assert.ok(link.body.length > 20 && !link.body.includes("—"), `RELATED.${key} body`);
  }
});

test("each guide gets four to six related links, never itself", () => {
  for (const slug of guideSlugs) {
    const links = relatedFor(slug);
    assert.ok(links.length >= 4 && links.length <= 6, `${slug} has ${links.length} related links`);
    assert.ok(!links.some((link) => link.href === `/${slug}`), `${slug} links to itself`);
    assert.equal(new Set(links.map((link) => link.href)).size, links.length, `${slug} repeats a link`);
  }
  assert.equal(DEFAULT_RELATED.length, 6);
});

test("a title that promises a printable has one on the page", () => {
  for (const slug of guideSlugs) {
    if (/printable/i.test(SEO_PAGES[slug].title)) {
      assert.ok(SLUG_PRINTABLES[slug]?.length, `${slug} promises a printable in its title but shows none`);
    }
  }
});
