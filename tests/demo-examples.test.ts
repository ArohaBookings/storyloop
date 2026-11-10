import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_EXAMPLES } from "../lib/demo-examples";
import { HERO_PROOFS } from "../lib/hero-proofs";
import { INTERNATIONAL_EXAMPLES } from "../lib/international-examples";
import { REAL_EXAMPLES } from "../lib/real-examples";

test("Aotearoa's demo example is the real draft, word for word", () => {
  const real = REAL_EXAMPLES.find((item) => item.slug === DEMO_EXAMPLES.NZ.source);
  assert.ok(real, "the source is a published real example");
  assert.equal(real.framework, "NZ");
  assert.equal(DEMO_EXAMPLES.NZ.note, real.note);
  assert.equal(DEMO_EXAMPLES.NZ.story, real.story);
  assert.deepEqual(DEMO_EXAMPLES.NZ.anchors, real.fromNote);
  assert.deepEqual(DEMO_EXAMPLES.NZ.checks, real.toCheck);
  // A Te Whāriki story, never an EYLF one, for a visitor in Aotearoa.
  assert.match(DEMO_EXAMPLES.NZ.story, /Mana aotūroa/);
  assert.doesNotMatch(DEMO_EXAMPLES.NZ.story, /EYLF/);
});

test("the demo plays the same story the photograph above it quotes", () => {
  assert.equal(HERO_PROOFS.NZ.slug, DEMO_EXAMPLES.NZ.source);
  assert.ok(DEMO_EXAMPLES.NZ.story.includes(HERO_PROOFS.NZ.excerpt), "the hero's sentence is in the story the demo writes");
});

test("England and Ireland play their own real drafts", () => {
  for (const region of ["UK", "IE"] as const) {
    assert.equal(DEMO_EXAMPLES[region].note, INTERNATIONAL_EXAMPLES[region].note);
    assert.equal(DEMO_EXAMPLES[region].story, INTERNATIONAL_EXAMPLES[region].story);
  }
  assert.match(DEMO_EXAMPLES.UK.story, /EYFS/);
  assert.match(DEMO_EXAMPLES.IE.story, /Aistear|Exploring and Thinking/);
});

test("every child's words in an example are in its note", () => {
  const plain = (text: string) => text.toLowerCase().replace(/[’‘'"“”]/g, "").replace(/\s+/g, " ");
  for (const [region, example] of Object.entries(DEMO_EXAMPLES)) {
    const quotes = [...example.story.matchAll(/"([^"\n]{2,80})"|“([^”\n]{2,80})”/g)].map((m) => m[1] ?? m[2]);
    assert.ok(quotes.length > 0, `${region} quotes the child`);
    for (const quote of quotes) assert.ok(plain(example.note).includes(plain(quote)), `${region}: "${quote}" is in the note`);
  }
});
