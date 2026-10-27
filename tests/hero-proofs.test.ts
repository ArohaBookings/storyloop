import assert from "node:assert/strict";
import test from "node:test";
import { HERO_PROOFS, heroRegionForZone } from "../lib/hero-proofs";
import { INTERNATIONAL_EXAMPLES } from "../lib/international-examples";
import { REAL_EXAMPLES } from "../lib/real-examples";

test("the phone hero's proof matches the real drafts exactly", () => {
  for (const region of ["AU", "NZ"] as const) {
    const proof = HERO_PROOFS[region];
    assert.equal(proof.href, `/examples#${proof.slug}`, `${region} links to the full story`);
    const example = REAL_EXAMPLES.find((item) => item.slug === proof.slug);
    assert.ok(example, `${region}: ${proof.slug} is a real example`);
    assert.equal(proof.title, example.title, `${region} title`);
    assert.equal(proof.words, example.words, `${region} word count`);
    assert.equal(example.framework, region, `${region} framework`);
    for (const link of proof.links) assert.ok(example.story.includes(link), `${region}: "${link}" is in the real story`);
    // The quoted words in the jot are the child's real words from the note.
    const quoted = proof.jot.match(/['"]([^'"]+)['"]/)?.[1];
    assert.ok(quoted && example.note.includes(quoted), `${region}: quote "${quoted}" is in the real note`);
  }
});

test("England and Ireland see their own real draft, linked to its guide", () => {
  for (const region of ["UK", "IE"] as const) {
    const proof = HERO_PROOFS[region];
    const example = INTERNATIONAL_EXAMPLES[region];
    assert.equal(proof.title, example.title, `${region} title`);
    assert.equal(proof.words, example.story.trim().split(/\s+/).length, `${region} word count`);
    for (const link of proof.links) assert.ok(example.story.includes(link), `${region}: "${link}" is in the real story`);
    for (const quoted of proof.jot.match(/'([^']+)'/g) ?? []) {
      assert.ok(example.note.includes(quoted), `${region}: ${quoted} is in the real note`);
    }
    assert.match(proof.href, /^\/(eyfs|aistear)-learning-stories#try$/);
  }
  assert.equal(heroRegionForZone("Pacific/Auckland"), "NZ");
  assert.equal(heroRegionForZone("Australia/Perth"), "AU");
  assert.equal(heroRegionForZone("Europe/London"), "UK");
  assert.equal(heroRegionForZone("Europe/Dublin"), "IE");
  assert.equal(heroRegionForZone("America/New_York"), "AU");
});
