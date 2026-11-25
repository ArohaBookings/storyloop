import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { HELD_PAGE_ON } from "../lib/build-switches";
import { heldPageOn } from "../lib/held-pages";
import { SEO_PAGES, SEO_PAGE_SLUGS } from "../lib/seo-pages";
import { ASSESSMENT_AND_RATING_REAIM, EYLF_PLANNING_CYCLE_REAIM } from "../lib/seo-pages-held";
import { BUYER_PAGES, HELD_BUYER_SLUGS, LIVE_BUYER_PAGE_SLUGS, buyerPageLive, isHeldPath, liveLinks, type BuyerSlug } from "../lib/buyer-pages";
import { relatedFor } from "../components/marketing/guide-links";

// MERGE2 2h (25 Nov 2026): the held pages as the conductor ruled them for the
// release, after Leo approved the release and its wording at 17:50. ON: the
// educational leader page, the re-aimed /eylf-planning-cycle and the re-aimed
// /assessment-and-rating-evidence. OFF: /qip-childcare, /exceeding-nqs-documentation
// (and the workload and family pages held since 19 Nov).

const ON = ["educational-leader-checklist", "eylf-planning-cycle", "assessment-and-rating-evidence"] as const;
const OFF = ["qip-childcare", "exceeding-nqs-documentation", "documentation-workload-early-childhood", "ask-your-centre"] as const;

/** The pages each switched-on page's plan says should link to it (analysis/search.json new_pages links_from). */
const LINKED_FROM: Record<(typeof ON)[number], string[]> = {
  "educational-leader-checklist": ["nqs-standards", "critical-reflection-early-childhood", "ai-policy", "for-centres", "how-to-check-a-learning-story"],
  "eylf-planning-cycle": ["observation-methods-early-childhood", "eylf-observation-examples", "eylf-learning-outcomes", "intentional-teaching", "nqs-standards"],
  "assessment-and-rating-evidence": ["nqs-standards", "educational-leader-checklist", "critical-reflection-early-childhood"],
};

const source = (file: string) => readFileSync(file, "utf8");

/** Every link a page shows, as the page renders it: held links already dropped. */
function linksOn(slug: string): string[] {
  const seo = SEO_PAGES[slug];
  if (seo && SEO_PAGE_SLUGS.includes(slug)) {
    return [
      ...relatedFor(slug).map((link) => link.href),
      ...seo.sections.flatMap((section) => liveLinks(section.links ?? []).map((link) => link.href)),
      ...liveLinks(seo.siblingLinks?.links ?? []).map((link) => link.href),
    ];
  }
  const buyer = BUYER_PAGES[slug as BuyerSlug];
  if (buyer) return [...liveLinks(buyer.related).map((link) => link.href), ...JSON.stringify(buyer.sections).match(/"\/[a-z0-9-]+"/g)!.map((href) => href.slice(1, -1)).filter((href) => !isHeldPath(href))];
  // A page with its own route: the address in its source, outside a held-page guard it does not pass.
  const file = `app/${slug}/page.tsx`;
  assert.ok(existsSync(file), `${slug} has a page`);
  return [...source(file).matchAll(/href="(\/[a-z0-9-]+)/g)].map((match) => match[1]).filter((href) => !isHeldPath(href));
}

test("the release's switches are as ruled", () => {
  for (const slug of ON) assert.equal(HELD_PAGE_ON[slug], true, slug);
  for (const slug of OFF) assert.equal(HELD_PAGE_ON[slug], false, slug);
  assert.equal(Object.keys(HELD_PAGE_ON).length, ON.length + OFF.length, "every held page is ruled one way or the other");
});

test("every switched-on page is in the sitemap, reachable, and shows its built words", () => {
  const sitemap = source("app/sitemap.ts");
  assert.match(sitemap, /\.\.\.LIVE_BUYER_PAGE_SLUGS/);
  assert.match(sitemap, /\.\.\.SEO_PAGE_SLUGS\]/);
  // The leader page is a buyer page: routed, metadata and share image live, listed.
  assert.ok(buyerPageLive("educational-leader-checklist"));
  assert.ok(LIVE_BUYER_PAGE_SLUGS.includes("educational-leader-checklist"));
  assert.ok(existsSync("app/educational-leader-checklist/page.tsx") && !isHeldPath("/educational-leader-checklist"));
  // The two re-aims keep their URL (already live and listed) with the new words.
  for (const slug of ["eylf-planning-cycle", "assessment-and-rating-evidence"]) assert.ok(SEO_PAGE_SLUGS.includes(slug) && heldPageOn(slug), slug);
  assert.equal(SEO_PAGES["eylf-planning-cycle"].title, EYLF_PLANNING_CYCLE_REAIM.title);
  assert.equal(SEO_PAGES["eylf-planning-cycle"].heading, EYLF_PLANNING_CYCLE_REAIM.heading);
  assert.equal(SEO_PAGES["assessment-and-rating-evidence"].title, ASSESSMENT_AND_RATING_REAIM.title);
  assert.equal(SEO_PAGES["assessment-and-rating-evidence"].heading, ASSESSMENT_AND_RATING_REAIM.heading);
});

test("every switched-on page has a title of 60 characters or fewer and a description of 155 or fewer, used once", () => {
  const pages = [
    { slug: "educational-leader-checklist", title: BUYER_PAGES["educational-leader-checklist"].title, description: BUYER_PAGES["educational-leader-checklist"].description },
    { slug: "eylf-planning-cycle", title: SEO_PAGES["eylf-planning-cycle"].title, description: SEO_PAGES["eylf-planning-cycle"].description },
    { slug: "assessment-and-rating-evidence", title: SEO_PAGES["assessment-and-rating-evidence"].title, description: SEO_PAGES["assessment-and-rating-evidence"].description },
  ];
  const everyTitle = [...Object.values(SEO_PAGES), ...LIVE_BUYER_PAGE_SLUGS.map((slug) => BUYER_PAGES[slug])].map((page) => page.title.toLowerCase());
  for (const page of pages) {
    assert.ok(page.title.length <= 60, `${page.slug} title is ${page.title.length}`);
    assert.ok(page.description.length <= 155, `${page.slug} description is ${page.description.length}`);
    assert.equal(everyTitle.filter((title) => title === page.title.toLowerCase()).length, 1, `${page.slug} title used once`);
    assert.ok(!/—/.test(page.title + page.description));
  }
});

test("every switched-on page is linked from the pages its plan names", () => {
  for (const [target, sources] of Object.entries(LINKED_FROM)) {
    for (const from of sources) assert.ok(linksOn(from).includes(`/${target}`), `/${from} links /${target}`);
  }
});

test("every switched-off page answers 404, is not in the sitemap, and nothing links to it", () => {
  for (const slug of OFF) {
    assert.ok(HELD_BUYER_SLUGS.includes(slug as BuyerSlug), `${slug} is a held page`);
    assert.equal(buyerPageLive(slug as BuyerSlug), false, slug);
    assert.ok(!LIVE_BUYER_PAGE_SLUGS.includes(slug as BuyerSlug), `${slug} not in the sitemap`);
    assert.ok(!SEO_PAGE_SLUGS.includes(slug), `${slug} is not a guide either`);
    assert.ok(isHeldPath(`/${slug}`));
    assert.match(source(`app/${slug}/opengraph-image.tsx`), new RegExp(`if \\(!buyerPageLive\\("${slug}"\\)\\) notFound\\(\\);`));
    for (const from of [...SEO_PAGE_SLUGS, ...LIVE_BUYER_PAGE_SLUGS]) assert.ok(!linksOn(from).includes(`/${slug}`), `/${from} links the held /${slug}`);
  }
  const page = source("components/buyer/BuyerPage.tsx");
  assert.match(page, /export function buyerMetadata\(slug: BuyerSlug\): Metadata \{\s*if \(!buyerPageLive\(slug\)\) notFound\(\);/);
});
