import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  ANSWER_BLOCKS,
  ANSWER_BLOCKS_BY_PATH,
  answerBlocks,
  splitAfterFirstExample,
  withAnswerBlocks,
  type AnswerBlockId,
} from "../lib/answer-blocks";
import { rivalNames } from "../lib/blog-topics";
import { BUYER_PAGES, BUYER_PAGE_SLUGS, type BuyerPage } from "../lib/buyer-pages";
import { LANDING_FAQS } from "../lib/landing-faqs";
import { PLAN_DEFINITIONS } from "../lib/plans";
import { DEDICATED_ROUTE_SLUGS, SEO_PAGES, SEO_PAGE_SLUGS } from "../lib/seo-pages";

// The pages for the people who buy, and the re-aimed product pages (18 and 19
// Nov 2026, the search re-aim; storyloop-ops research/search-audience has the
// research, its 27 corrections and the audience test).

const EXPECTED_BUYER_SLUGS = [
  "ai-for-early-childhood-educators",
  "ai-childcare-observations",
  "educational-leader-checklist",
  "documentation-workload-early-childhood",
  "ask-your-centre",
  "ai-policy-nz-early-childhood",
  "exceeding-nqs-documentation",
];

/** Existing pages the re-aim gave a new title, description, heading or first screen. */
const RE_AIMED_SEO_SLUGS = [
  "learning-story-generator",
  "te-whariki-learning-stories",
  "eylf-learning-stories",
  "for-centres",
  "learning-story-software-cost-for-centres",
  "pricing",
  "assessment-and-rating-evidence",
  "ero-early-childhood-regulation-2026",
];

const source = (file: string) => readFileSync(file, "utf8");

/** How a page title reads in a search result: the brand only when the whole still fits 60 characters. */
function renderedTitle(title: string) {
  return `${title} | StoryLoop`.length <= 60 ? `${title} | StoryLoop` : title;
}

function buyerText(page: BuyerPage) {
  return [
    page.title,
    page.description,
    page.kicker,
    page.h1,
    page.lead ?? "",
    ...page.sections.flatMap((section) => [section.heading, ...(section.paragraphs ?? []), ...(section.list ?? []), section.link?.label ?? ""]),
    page.example?.heading ?? "",
    page.example?.caption ?? "",
    ...page.faqs.flatMap((faq) => [faq.q, faq.a]),
    ...page.related.flatMap((link) => [link.title, link.body]),
  ].join("\n");
}

/** The messages a leader or a parent copies from the page (components/buyer/BuyerPage.tsx). */
function messages() {
  const file = source("components/buyer/BuyerPage.tsx");
  const leader = file.match(/LEADER_MESSAGE =\s*"([^"]+)"/)?.[1] ?? "";
  const parent = file.match(/PARENT_MESSAGE =\s*"([^"]+)"/)?.[1] ?? "";
  return { leader, parent };
}

/** What the re-aim wrote on the existing pages: titles, descriptions, headings, the first-screen checklist, the new sections. */
function reAimedText() {
  const newSections = new Set(["Writing learning stories with AI, safely", "What it costs", "For your educational leader"]);
  return RE_AIMED_SEO_SLUGS.flatMap((slug) => {
    const page = SEO_PAGES[slug];
    return [
      page.title,
      page.description,
      page.heading,
      ...(page.checklist ? [page.checklist.heading, ...page.checklist.items, page.checklist.note, page.checklist.link.label] : []),
      ...page.sections.filter((section) => newSections.has(section.title)).flatMap((section) => [section.title, section.body, ...(section.links?.map((link) => link.label) ?? [])]),
      ...(page.siblingLinks?.links.map((link) => link.label) ?? []),
    ];
  }).join("\n");
}

const everyNewWord = () =>
  [
    ...BUYER_PAGE_SLUGS.map((slug) => buyerText(BUYER_PAGES[slug])),
    ...Object.values(ANSWER_BLOCKS).flatMap((block) => [block.question, block.answer]),
    messages().leader,
    messages().parent,
    reAimedText(),
  ].join("\n");

function routeExists(href: string) {
  const path = href.replace(/^\//, "").split(/[#?]/)[0];
  if (path === "") return true;
  if ((BUYER_PAGE_SLUGS as string[]).includes(path)) return true;
  if (SEO_PAGE_SLUGS.includes(path) || DEDICATED_ROUTE_SLUGS.has(path)) return true;
  return existsSync(`app/${path}/page.tsx`);
}

test("the seven buyer pages exist, each with its own route, metadata and share image", () => {
  assert.deepEqual([...BUYER_PAGE_SLUGS].sort(), [...EXPECTED_BUYER_SLUGS].sort());
  for (const slug of BUYER_PAGE_SLUGS) {
    const page = BUYER_PAGES[slug];
    assert.equal(page.slug, slug);
    const route = `app/${slug}/page.tsx`;
    assert.ok(existsSync(route), route);
    assert.match(source(route), new RegExp(`buyerMetadata\\("${slug}"\\)`), `${route} metadata`);
    assert.match(source(route), new RegExp(`<BuyerPage slug="${slug}"`), `${route} renders its page`);
    assert.ok(existsSync(`app/${slug}/opengraph-image.tsx`), `${slug} share image`);
    // Not also built by the generic guide route.
    assert.ok(!SEO_PAGE_SLUGS.includes(slug), `${slug} is also a guide`);
  }
});

test("every new and re-aimed page fits a search result: title at most 60 characters, description at most 155", () => {
  const pages = [
    ...BUYER_PAGE_SLUGS.map((slug) => ({ slug, title: BUYER_PAGES[slug].title, description: BUYER_PAGES[slug].description })),
    ...RE_AIMED_SEO_SLUGS.map((slug) => ({ slug, title: SEO_PAGES[slug].title, description: SEO_PAGES[slug].description })),
  ];
  for (const page of pages) {
    assert.ok(renderedTitle(page.title).length <= 60, `${page.slug}: title "${renderedTitle(page.title)}" is ${renderedTitle(page.title).length}`);
    assert.ok(page.description.length >= 70 && page.description.length <= 155, `${page.slug}: description is ${page.description.length}`);
    assert.ok(!/\{centre_trial\}/i.test(page.description), `${page.slug}: a search description cannot follow the calendar`);
  }
});

test("one H1 on every page, and each buyer page has its own", () => {
  assert.equal(source("components/buyer/BuyerPage.tsx").match(/<h1\b/g)?.length, 1);
  assert.equal(source("app/[slug]/page.tsx").match(/<h1\b/g)?.length, 1);
  const headings = BUYER_PAGE_SLUGS.map((slug) => BUYER_PAGES[slug].h1);
  for (const h1 of headings) assert.ok(h1.length > 10 && h1.length <= 90, h1);
  assert.equal(new Set(headings).size, headings.length);
});

test("every page passes the audience test in its definition: one of the three buyers, what she typed, what the first screen lets her do", () => {
  const actions: Record<string, string[]> = { educator: ["note"], centre: ["centre", "leader_ask", "policy"], parent: ["parent_ask"] };
  const buyers = new Set<string>();
  for (const slug of BUYER_PAGE_SLUGS) {
    const page = BUYER_PAGES[slug];
    buyers.add(page.audience.buyer);
    assert.ok(actions[page.audience.buyer].includes(page.action.kind), `${slug}: a ${page.audience.buyer} page cannot open on "${page.action.kind}"`);
    assert.ok(page.audience.who.length > 20, `${slug}: who it is for`);
    assert.ok(page.audience.firstScreen.length > 40, `${slug}: what the first screen lets her do`);
    if (page.audience.buyer !== "parent") assert.ok(page.audience.typed.length >= 2, `${slug}: what she typed`);
    for (const phrase of page.audience.typed) {
      assert.equal(phrase, phrase.toLowerCase(), `${slug}: typed phrases are written as typed`);
      assert.ok(!/\b(free (template|printable)|pdf|worksheet|assignment|student)\b/.test(phrase), `${slug}: "${phrase}" is a free-material or student search`);
    }
  }
  assert.deepEqual([...buyers].sort(), ["centre", "educator", "parent"]);
  // Correction C20: the workload page does not chase burnout searches (staff, students and journalists).
  assert.ok(!BUYER_PAGES["documentation-workload-early-childhood"].audience.typed.some((phrase) => /burnout/.test(phrase)));
});

test("no banned words: no em dash, no rival or other AI product, no pause or cancel, no 'works alongside', NZ and Australian spelling", () => {
  const text = everyNewWord();
  assert.ok(!text.includes("—"), "em dash");
  assert.deepEqual(rivalNames(text), []);
  // "Mana" appears only as a Te Whāriki strand, never as a product.
  assert.doesNotMatch(text, /\bMana\b(?!\s+(atua|whenua|tangata|reo|aot[uū]roa))/);
  assert.doesNotMatch(text, /works? (beside|alongside)|does not replace|doesn't replace|instead of (your|the) (app|platform)/i);
  assert.doesNotMatch(text, /\b(pause|pausing|paused|cancel|cancelling|cancelled|cancels)\b/i, "pause and cancel live on Billing only");
  assert.doesNotMatch(text, /free,? printable|download (the|a|our) (template|checklist|pdf)/i);
  assert.doesNotMatch(text, /\b\d+ days free\b|\b30-day\b/i, "the centre's free period comes from the shared wording");
  assert.doesNotMatch(text, /\b(center|centers|centered|color|behavior|organize|organized|organization|favorite|analyze|enrollment|labeled)\b/i, "US spelling");
});

test("survey figures: only the one confirmed on the source (NZEI, more than 4,000 teachers and staff, 44% unpaid work)", () => {
  const workload = buyerText(BUYER_PAGES["documentation-workload-early-childhood"]) + ANSWER_BLOCKS.G.answer;
  assert.match(workload, /more than 4,000/);
  assert.match(workload, /teachers and staff/);
  assert.match(workload, /44%/);
  const text = everyNewWord();
  assert.doesNotMatch(text, /4,174|81%|\b12%/, "unconfirmed figures (corrections C4 to C6)");
  assert.doesNotMatch(ANSWER_BLOCKS.G.answer, /gives that time back/, "no claimed effect (C6)");
});

test("the New Zealand AI policy page says good practice, never required", () => {
  const text = buyerText(BUYER_PAGES["ai-policy-nz-early-childhood"]) + ANSWER_BLOCKS.F_NZ.answer;
  assert.match(text, /good practice/);
  assert.doesNotMatch(text, /\b(is|are|legally|now) required\b|\bmust have an AI policy\b/i);
  assert.match(text, /no New Zealand rule that requires/);
});

test("every price on these pages is a price lib/plans.ts charges", () => {
  const allowed = new Set(PLAN_DEFINITIONS.flatMap((plan) => [`NZ$${plan.price.NZD}`, `A$${plan.price.AUD}`]));
  const found = everyNewWord().match(/(?:NZ|A)\$\d+(?:\.\d+)?/g) ?? [];
  assert.ok(found.length > 5);
  for (const price of found) assert.ok(allowed.has(price), `${price} is not a plan price`);
});

test("each answer block is on exactly the pages its where list names", () => {
  const shownOn = new Map<AnswerBlockId, Set<string>>();
  const add = (id: AnswerBlockId, path: string) => shownOn.set(id, (shownOn.get(id) ?? new Set()).add(path));
  for (const slug of BUYER_PAGE_SLUGS) for (const id of BUYER_PAGES[slug].answers) add(id, `/${slug}`);
  for (const [path, ids] of Object.entries(ANSWER_BLOCKS_BY_PATH)) for (const id of ids) add(id, path);
  for (const block of Object.values(ANSWER_BLOCKS)) {
    assert.deepEqual([...block.where].sort(), [...(shownOn.get(block.id) ?? [])].sort(), `block ${block.id}`);
  }
  // The pages outside the guide route really show theirs.
  assert.equal(LANDING_FAQS[0].q, ANSWER_BLOCKS.A.question);
  assert.equal(LANDING_FAQS[0].a, ANSWER_BLOCKS.A.answer);
  assert.match(source("app/ai-policy/page.tsx"), /ANSWER_BLOCKS\.F\.question/);
  assert.match(source("app/safety/page.tsx"), /ANSWER_BLOCKS\.D\.question/);
  assert.match(source("app/blog/[slug]/page.tsx"), /answerBlocksFor\(`\/blog\/\$\{post\.slug\}`\)/);
  for (const path of Object.keys(ANSWER_BLOCKS_BY_PATH)) {
    const slug = path.slice(1);
    if (["", "safety", "ai-policy"].includes(slug) || slug.startsWith("blog/")) continue;
    assert.ok(SEO_PAGE_SLUGS.includes(slug), `${path} is a guide page`);
  }
  assert.match(source("app/[slug]/page.tsx"), /withAnswerBlocks\(`\/\$\{page\.slug\}`, page\.faqs\)/);
});

test("the privacy answer says what the data sheet says, US drafting included (C7)", () => {
  const answer = ANSWER_BLOCKS.D.answer;
  for (const fact of [/first names only/, /Sydney, Australia/, /AI provider in the United States/, /not allow it to be used to train/]) assert.match(answer, fact);
  const sheet = source("app/data-sheet/page.tsx");
  assert.match(sheet, /Sydney, Australia/);
  assert.match(sheet, /in the United States: draft stories/);
  assert.match(sheet, /do not use what is sent to them to train their models/);
});

test("a guide's own question gives way to an answer block that asks the same thing, never twice", () => {
  const faqs = withAnswerBlocks("/learning-story-generator", SEO_PAGES["learning-story-generator"].faqs);
  assert.deepEqual(faqs.slice(0, 2).map((faq) => faq.block), ["A", "B"]);
  const questions = faqs.map((faq) => faq.question.toLowerCase());
  assert.equal(new Set(questions).size, questions.length);
  assert.equal(questions.filter((q) => q === "what is storyloop?").length, 1);
  assert.deepEqual(withAnswerBlocks("/no-such-page", [{ question: "Q", answer: "A" }]), [{ question: "Q", answer: "A" }]);
  assert.deepEqual(answerBlocks(["C"]).map((block) => block.id), ["C"]);
});

test("on the examples post, the answer goes straight after the first worked example (C17)", () => {
  const post = [
    "Intro paragraph.",
    "## What a good learning story does",
    "Why it matters.",
    "## Example one, toddler, stack, drop, repeat",
    "The first worked example.",
    "> A quote from it.",
    "## Example two, preschooler, a plan",
    "The second example.",
    "## A learning story template that stays useful",
    "Template text.",
  ].join("\n\n");
  const split = splitAfterFirstExample(post);
  assert.ok(split);
  assert.ok(split.before.startsWith("Intro paragraph."), "the post's own opening comes first");
  assert.ok(split.before.endsWith("> A quote from it."), "the whole first example comes before the block");
  assert.ok(split.after.startsWith("## Example two"), "the rest follows");
  assert.equal(`${split.before}\n\n${split.after}`, post, "nothing is lost or changed");
  assert.equal(splitAfterFirstExample("## Why\n\nNo examples here."), null);
  assert.equal(splitAfterFirstExample("Intro\n\n## Example one\n\nThe only section."), null);
  assert.equal(splitAfterFirstExample(post.replace(/\n\n/g, "\r\n\r\n"))?.after.startsWith("## Example two"), true);
});

test("titles, headings and descriptions the check said to keep are unchanged", () => {
  assert.match(source("app/layout.tsx"), /default: "StoryLoop: AI learning stories for Te Whāriki and EYLF"/, "C1 homepage title");
  const policy = source("app/ai-policy/page.tsx");
  assert.match(policy, /title: "Free AI Policy Template for Early Childhood Services"/, "C2 /ai-policy title");
  assert.match(policy, /"Generate a responsible AI in documentation policy for your early childhood centre or kindergarten in New Zealand or Australia\. Free, no signup, ready to adopt\."/);
  assert.match(policy, /Your service&apos;s AI policy, written in ten minutes\./);
  assert.equal(SEO_PAGES["nsw-transition-to-school-statement"].title, "NSW Transition to School Statement 2026: Login and Examples", "C16");
  assert.match(source("app/for-educators/page.tsx"), /"Learning stories without the late nights \| StoryLoop"/, "C21");
  assert.equal(SEO_PAGES["for-centres"].heading, "Documentation done in the day, and a calmer review visit.");
  assert.equal(SEO_PAGES.pricing.heading, "Start free. Upgrade when it is worth it.");
  assert.equal(SEO_PAGES["learning-story-software-cost-for-centres"].heading, "What does learning story software cost a centre?");
  assert.equal(SEO_PAGES["assessment-and-rating-evidence"].heading, "You get a few days' notice, not a few weeks.");
  assert.equal(SEO_PAGES["ero-early-childhood-regulation-2026"].heading, "ERO regulates early childhood education now. Here is what changed.");
  assert.match(source("app/examples/page.tsx"), /title: "Learning story examples: 12 real notes and drafts"/);
});

test("the re-aimed product pages open on the product, and the cost and checklist pages on what their titles promise", () => {
  const renderer = source("app/[slug]/page.tsx");
  for (const slug of ["learning-story-generator", "te-whariki-learning-stories", "eylf-learning-stories"]) {
    assert.match(renderer, new RegExp(`"${slug}": "(visitor|NZ|AU)"`), `${slug} has the product hero`);
  }
  // C10: StoryLoop's own two centre prices first, nothing about other pricing models.
  const table = source("components/buyer/CentrePriceTable.tsx");
  assert.match(table, /"centre_starter", "centre_growth"/);
  assert.match(table, /Unlimited children, no per-child fee/);
  assert.doesNotMatch(table, /per educator|per-educator|platforms/i);
  // C3, and the checklist the new title promises.
  const rating = SEO_PAGES["assessment-and-rating-evidence"];
  assert.equal(rating.description, "What an assessor reads in your documentation for Standard 1.3, and a checklist to work through in the few days' notice you get.");
  assert.match(rating.title, /checklist/i);
  assert.equal(rating.checklist?.items.length, 6);
  assert.match(rating.checklist?.note ?? "", /centre plan/);
  assert.equal(rating.checklist?.link.href, "/for-centres");
  // The centre page opens on what it is and the two-minute check; the free period is in the line under the button.
  assert.match(SEO_PAGES["for-centres"].intro, /send you a story about a child you know: checking it takes about two minutes, and you need no account/);
});

test("every buyer page and re-aimed page is in the sitemap and open to search engines", () => {
  const sitemap = source("app/sitemap.ts");
  assert.match(sitemap, /\.\.\.BUYER_PAGE_SLUGS/);
  for (const slug of ["for-families", "features", "examples", "ai-policy", "safety", "for-educators"]) assert.ok(sitemap.includes(`"${slug}"`), slug);
  for (const slug of RE_AIMED_SEO_SLUGS) assert.ok(SEO_PAGE_SLUGS.includes(slug), slug);
  const disallowBlock = source("app/robots.ts").match(/disallow: \[([\s\S]*?)\]/)?.[1] ?? "";
  const disallowed = [...disallowBlock.matchAll(/"(\/[^"]*)"/g)].map((match) => match[1].replace(/\$$/, ""));
  assert.ok(disallowed.includes("/dashboard") && !disallowed.includes("/"));
  for (const slug of [...BUYER_PAGE_SLUGS, ...RE_AIMED_SEO_SLUGS]) {
    assert.ok(!disallowed.some((rule) => `/${slug}`.startsWith(rule.replace(/\?$/, ""))), `/${slug} is blocked in robots`);
  }
});

test("every link on the buyer pages goes somewhere real", () => {
  for (const slug of BUYER_PAGE_SLUGS) {
    const page = BUYER_PAGES[slug];
    for (const link of [...page.related, ...page.sections.flatMap((section) => (section.link ? [section.link] : []))]) {
      assert.ok(routeExists(link.href), `${slug} links ${link.href}`);
    }
    for (const source of page.sources ?? []) assert.match(source.url, /^https:\/\//);
  }
  for (const slug of RE_AIMED_SEO_SLUGS) {
    const page = SEO_PAGES[slug];
    const links = [...(page.siblingLinks?.links ?? []), ...page.sections.flatMap((section) => section.links ?? []), ...(page.checklist ? [page.checklist.link] : [])];
    for (const link of links) assert.ok(routeExists(link.href), `${slug} links ${link.href}`);
  }
});

test("the copied messages carry no child's name and no referral code; the tap counts carry no text", () => {
  const { leader, parent } = messages();
  assert.match(parent, /\[your child's name\]/);
  assert.match(parent, /utm_source=family/);
  assert.doesNotMatch(parent, /[?&]ref=/, "ref= is a referral code a signup would credit");
  assert.match(leader, /Send this story to your leader/);
  const copy = source("components/buyer/CopyMessage.tsx");
  const calls = copy.match(/trackEvent\([^)]*\)/g) ?? [];
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call, /^trackEvent\("ui_action", \{ action: `\$\{action\}_(copy|email)`, page \}\)$/);
  }
  for (const code of ["leader_ask_copy", "ask_centre_copy", "ask_centre_email"]) assert.match(code, /^[a-z0-9_]{2,40}$/);
  // The family arrival line on /for-centres reads the address only.
  const arrival = source("components/buyer/FamilyArrival.tsx");
  assert.match(arrival, /get\("utm_source"\) === "family"/);
  assert.doesNotMatch(arrival, /fetch\(|trackEvent|localStorage/);
});
