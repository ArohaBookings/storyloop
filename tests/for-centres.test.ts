import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { rivalNames } from "../lib/blog-topics";
import { PLAN_DEFINITIONS } from "../lib/plans";
import { DEDICATED_ROUTE_SLUGS, SEO_PAGES, SEO_PAGE_SLUGS } from "../lib/seo-pages";

// The page a centre buyer reads, and the data sheet they hand on (12 Nov 2026).

const page = SEO_PAGES["for-centres"];
const guideSlugs = new Set(SEO_PAGE_SLUGS.filter((slug) => !DEDICATED_ROUTE_SLUGS.has(slug)));

function everyWord() {
  return [
    page.title,
    page.description,
    page.kicker,
    page.heading,
    page.intro,
    ...page.sections.flatMap((s) => [s.title, s.body]),
    ...page.faqs.flatMap((f) => [f.question, f.answer]),
    ...(page.siblingLinks?.links.map((l) => l.label) ?? []),
  ].join("\n");
}

function routeExists(href: string) {
  const path = href.replace(/^\//, "").split(/[#?]/)[0];
  return guideSlugs.has(path) || existsSync(`app/${path}/page.tsx`);
}

test("the centre page fits in a search result", () => {
  assert.ok(page.title.length <= 60, `title is ${page.title.length} characters`);
  assert.match(page.title, /learning story software for ECE centres/i);
  assert.ok(page.description.length >= 150 && page.description.length <= 160, `description is ${page.description.length} characters`);
});

test("the centre page has no em dash and names no other product", () => {
  const text = everyWord();
  assert.ok(!text.includes("—"), "em dash on the centre page");
  assert.deepEqual(rivalNames(text), []);
});

test("the centre page has six to nine short sections and five or six questions", () => {
  assert.ok(page.sections.length >= 6 && page.sections.length <= 9, `${page.sections.length} sections`);
  for (const section of page.sections) {
    const words = section.body.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 40 && words <= 90, `"${section.title}" is ${words} words`);
  }
  assert.ok(page.faqs.length >= 5 && page.faqs.length <= 6, `${page.faqs.length} FAQs`);
  const questions = page.faqs.map((f) => f.question);
  for (const q of [
    "Do we have to stop using what we have for families?",
    "What happens to our stories if we stop?",
    "Who is behind StoryLoop?",
    "Can a leader see everything an educator writes?",
  ]) {
    assert.ok(questions.includes(q), `missing FAQ: ${q}`);
  }
});

test("the centre page's sibling links resolve, and one is the data sheet", () => {
  const links = page.siblingLinks?.links ?? [];
  assert.ok(links.length > 0);
  for (const link of links) assert.ok(routeExists(link.href), `${link.href} does not exist`);
  assert.ok(links.some((link) => link.href === "/data-sheet"));
});

test("the centre page quotes the centre prices exactly as lib/plans.ts has them", () => {
  const text = everyWord();
  for (const key of ["centre_starter", "centre_growth"] as const) {
    const plan = PLAN_DEFINITIONS.find((p) => p.key === key)!;
    assert.ok(text.includes(`NZ$${plan.price.NZD}`) && text.includes(`A$${plan.price.AUD}`), `${plan.name} price`);
    assert.ok(text.includes(`up to ${plan.seats}`), `${plan.name} seats`);
  }
});

test("the data sheet exists, is public, printable, linked and in the sitemap", () => {
  const file = "app/data-sheet/page.tsx";
  assert.ok(existsSync(file));
  const source = readFileSync(file, "utf8");
  assert.ok(!source.includes("—"), "em dash on the data sheet");
  assert.match(source, /StoryLoop data sheet/);
  assert.match(source, /For owners, boards and approved providers/);
  assert.match(source, /Print this page/);
  assert.match(source, /canonical: "\/data-sheet"/);
  assert.ok(!file.includes("(app)"), "the data sheet must not sit behind sign-in");
  assert.ok(readFileSync("app/sitemap.ts", "utf8").includes('"data-sheet"'));
  assert.ok(readFileSync("components/landing/Footer.tsx", "utf8").includes('href="/data-sheet"'));
  const robots = readFileSync("app/robots.ts", "utf8");
  assert.ok(!robots.includes('"/data-sheet'), "the data sheet is blocked in robots");
});
