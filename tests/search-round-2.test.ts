import assert from "node:assert/strict";
import test from "node:test";
import { SEO_PAGES } from "../lib/seo-pages";
import { ASSESSMENT_AND_RATING_REAIM, EYLF_PLANNING_CYCLE_REAIM } from "../lib/seo-pages-held";
import { HELD_PAGE_ON } from "../lib/held-pages";
import { BUYER_PAGES, HELD_BUYER_SLUGS, LIVE_BUYER_PAGE_SLUGS, buyerPageLive, isHeldPath } from "../lib/buyer-pages";
import { ANSWER_BLOCKS, ANSWER_BLOCKS_BY_PATH } from "../lib/answer-blocks";
import { GUIDE_PRODUCT, HELD_GUIDE_PRODUCT, guideProductHasDemo } from "../lib/guide-product";
import { rivalNames } from "../lib/blog-topics";

// Builder X3, 25 Nov 2026: search round 2 (growth-ops.json search_next, the QIP page, the assessment and rating re-aim).

test("the assessment and rating re-aim is on for the release and the QIP page stays held (MERGE2 2h)", () => {
  assert.equal(HELD_PAGE_ON["assessment-and-rating-evidence"], true);
  assert.equal(HELD_PAGE_ON["qip-childcare"], false);
  assert.equal(SEO_PAGES["assessment-and-rating-evidence"].title, ASSESSMENT_AND_RATING_REAIM.title);
  assert.equal(SEO_PAGES["assessment-and-rating-evidence"].heading, ASSESSMENT_AND_RATING_REAIM.heading);
  assert.ok(HELD_BUYER_SLUGS.includes("qip-childcare"));
  assert.ok(!buyerPageLive("qip-childcare"));
  assert.ok(!LIVE_BUYER_PAGE_SLUGS.includes("qip-childcare"));
  assert.ok(isHeldPath("/qip-childcare") && isHeldPath("https://storyloop.space/qip-childcare#x"));
  assert.equal(HELD_GUIDE_PRODUCT["assessment-and-rating-evidence"]?.kind, "leader");
  assert.equal(GUIDE_PRODUCT["assessment-and-rating-evidence"], undefined);
});

test("every title fits 60 characters and every description 155, live and held, with no title used twice", () => {
  const pages = [
    ...Object.values(SEO_PAGES).map((page) => ({ slug: page.slug, title: page.title, description: page.description })),
    ...Object.values(BUYER_PAGES).map((page) => ({ slug: page.slug, title: page.title, description: page.description })),
  ];
  const held = [
    { slug: "assessment-and-rating-evidence (held)", title: ASSESSMENT_AND_RATING_REAIM.title, description: ASSESSMENT_AND_RATING_REAIM.description },
    { slug: "eylf-planning-cycle (held)", title: EYLF_PLANNING_CYCLE_REAIM.title, description: EYLF_PLANNING_CYCLE_REAIM.description },
  ];
  const changed = ["nqs-standard-1-3-assessment-and-planning", "qip-childcare", "exceeding-nqs-documentation"];
  for (const page of [...pages.filter((p) => changed.includes(p.slug)), ...held]) {
    assert.ok(page.title.length <= 60, `${page.slug} title ${page.title.length}`);
    assert.ok(page.description.length <= 155, `${page.slug} description ${page.description.length}`);
  }
  // A held re-aim that is switched on IS its live page now, so it is counted once.
  const titles = [...pages, ...held.filter((page) => !pages.some((live) => live.title === page.title))].map((page) => page.title.toLowerCase());
  assert.equal(new Set(titles).size, titles.length, "a title is used twice");
});

test("one search, one page: the held Exceeding page is aimed back at Exceeding, the assessment and rating re-aim takes the visit search", () => {
  const exceeding = BUYER_PAGES["exceeding-nqs-documentation"];
  assert.match(exceeding.title, /^Exceeding NQS/);
  assert.ok(!exceeding.audience.typed.some((phrase) => phrase.startsWith("assessment and rating")));
  assert.match(ASSESSMENT_AND_RATING_REAIM.title, /^Assessment and Rating/);
  assert.match(ASSESSMENT_AND_RATING_REAIM.heading, /^Assessment and rating/);
  assert.match(ASSESSMENT_AND_RATING_REAIM.intro, /^What happens at the visit, what the assessor reads in Quality Area 1/);
  assert.ok(ASSESSMENT_AND_RATING_REAIM.sections.some((section) => /Quality Improvement Plan/.test(section.body) || section.title.includes("QIP")));
});

test("the QIP page: two examples marked as examples, ACECQA as the source, the centre offer through the shared token, no template to download", () => {
  const page = BUYER_PAGES["qip-childcare"];
  const words = JSON.stringify(page);
  assert.equal(page.action.kind, "centre");
  assert.equal(page.sections.filter((section) => /^Example \d, written for this page/.test(section.heading)).length, 2);
  assert.ok(page.sources?.every((source) => source.url.startsWith("https://www.acecqa.gov.au/")));
  const leader = page.sections.find((section) => section.id === "for-your-centre");
  assert.match(leader?.paragraphs?.join(" ") ?? "", /the stories your team shares are in one place/);
  assert.match(leader?.paragraphs?.join(" ") ?? "", /about two minutes/);
  assert.match(leader?.paragraphs?.join(" ") ?? "", /\{Centre_trial\}, no card/);
  assert.doesNotMatch(words, /download|printable|pdf|template you can/i);
  assert.deepEqual(rivalNames(words), []);
  assert.ok(!words.includes("—"));
});

test("the new answers for assistants: on the pages named, true to the plans, no other product, no em dash", () => {
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/eylf-observation-examples"], ["H"]);
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/te-whariki-learning-stories"], ["I"]);
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/blog/writing-learning-stories-faster"], ["J"]);
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/learning-stories-in-family-languages"], ["K"]);
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/faq"], ["B"]);
  assert.deepEqual(ANSWER_BLOCKS_BY_PATH["/ai-policy"], ["F", "D"]);
  for (const id of ["H", "I", "J", "K"] as const) {
    const block = ANSWER_BLOCKS[id];
    assert.deepEqual(rivalNames(block.answer), [], id);
    assert.ok(!block.answer.includes("—"), id);
    assert.ok(block.answer.split(/\s+/).length <= 75, `${id} is short enough to quote`);
  }
  assert.match(ANSWER_BLOCKS.I.answer, /NZ\$21 a month/);
  // Family translation is on Educator Pro and centre plans only (lib/plans.ts translationReadability).
  assert.match(ANSWER_BLOCKS.K.answer, /Educator Pro plan or a centre plan/);
});

test("the note box on three example pages, each page with one box, and the season sentence on four statement guides", () => {
  for (const slug of ["learning-story-examples-eylf", "learning-story-examples-nz", "learning-story-next-steps-examples"]) assert.ok(guideProductHasDemo(slug), slug);
  for (const slug of ["nsw-transition-to-school-statement", "qld-kindergarten-transition-statement", "transition-to-school-statement", "summative-assessment-examples"]) {
    const page = SEO_PAGES[slug];
    const section = page.sections.find((s) => /The easiest (statements|summaries) come from short stories written through the year\./.test(s.body));
    assert.ok(section, slug);
    assert.deepEqual(section.links?.map((link) => link.href), ["/eylf-observation-examples"], slug);
  }
  assert.match(SEO_PAGES["nqs-standard-1-3-assessment-and-planning"].title, /Quality Area 1/);
});
