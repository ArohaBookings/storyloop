import assert from "node:assert/strict";
import test from "node:test";
import { EYLF_OUTCOMES, eylfOutcomeBySlug, realExampleForOutcome } from "../lib/eylf-outcomes";
import { TE_WHARIKI_STRANDS, realExampleForStrand, strandBySlug } from "../lib/te-whariki-strands";
import { DEDICATED_ROUTE_SLUGS, SEO_PAGES, SEO_PAGE_SLUGS } from "../lib/seo-pages";

// The curriculum pages quote official wording and state counts in their titles,
// FAQs and the hero. A typo in the data would put a wrong number on every page,
// as "21 sub-outcomes" once did, so the shape is pinned to the documents.

test("EYLF V2.0: five outcomes, 20 sub-outcomes in the published split", () => {
  assert.deepEqual(EYLF_OUTCOMES.map((outcome) => outcome.n), [1, 2, 3, 4, 5]);
  assert.deepEqual(EYLF_OUTCOMES.map((outcome) => outcome.subs.length), [4, 4, 3, 4, 5]);
  for (const outcome of EYLF_OUTCOMES) {
    assert.equal(outcome.slug, `outcome-${outcome.n}`);
    assert.equal(eylfOutcomeBySlug(outcome.slug), outcome);
    outcome.subs.forEach((sub, index) => assert.equal(sub.code, `${outcome.n}.${index + 1}`));
    for (const text of [outcome.plain, outcome.ages.babies, outcome.ages.toddlers, outcome.ages.preschoolers, ...outcome.subs.flatMap((sub) => [sub.text, sub.looks])]) {
      assert.ok(text.trim().length > 10, `empty text under outcome ${outcome.n}`);
    }
  }
});

test("EYLF real examples quote a real draft's own link line", () => {
  for (const outcome of EYLF_OUTCOMES) {
    const real = realExampleForOutcome(outcome.n);
    if (!real) continue;
    assert.equal(real.example.framework, "AU");
    assert.ok(real.line.startsWith(`EYLF Outcome ${outcome.n}:`));
    assert.ok(real.example.story.includes(real.line));
  }
});

test("Te Whāriki: five strands, 18 goals, 20 learning outcomes", () => {
  assert.deepEqual(TE_WHARIKI_STRANDS.map((strand) => strand.n), [1, 2, 3, 4, 5]);
  assert.deepEqual(TE_WHARIKI_STRANDS.map((strand) => strand.goals.length), [3, 4, 3, 4, 4]);
  assert.deepEqual(TE_WHARIKI_STRANDS.map((strand) => strand.outcomes.length), [3, 4, 3, 6, 4]);
  assert.deepEqual(
    TE_WHARIKI_STRANDS.map((strand) => `${strand.maori} | ${strand.english}`),
    ["Mana atua | Wellbeing", "Mana whenua | Belonging", "Mana tangata | Contribution", "Mana reo | Communication", "Mana aotūroa | Exploration"],
  );
  for (const strand of TE_WHARIKI_STRANDS) {
    assert.equal(strandBySlug(strand.slug), strand);
    assert.match(strand.slug, /^mana-[a-z]+-[a-z]+$/);
  }
});

test("every strand has a real New Zealand draft that links it", () => {
  for (const strand of TE_WHARIKI_STRANDS) {
    const real = realExampleForStrand(strand);
    assert.ok(real, `no real draft links ${strand.maori}`);
    assert.equal(real.example.framework, "NZ");
    assert.ok(real.paragraph.includes(`${strand.maori} | ${strand.english}`));
  }
});

test("new routes never collide with a generic guide or each other", () => {
  const strandSlugs = TE_WHARIKI_STRANDS.map((strand) => strand.slug);
  for (const slug of strandSlugs) assert.equal(SEO_PAGES[slug], undefined, `${slug} is also a generic guide`);
  assert.ok(DEDICATED_ROUTE_SLUGS.has("te-whariki-learning-outcomes-guide"));
  assert.ok(!SEO_PAGE_SLUGS.includes("te-whariki-learning-outcomes-guide"));
  for (const slug of ["te-whariki-pdf", "eylf-v2-changes"]) {
    assert.ok(SEO_PAGE_SLUGS.includes(slug), `${slug} missing`);
    assert.ok(SEO_PAGES[slug].deepDive?.length, `${slug} has no deep dive`);
  }
});
