import assert from "node:assert/strict";
import test from "node:test";
import { HERO_PROOFS } from "../lib/hero-proofs";
import { REAL_EXAMPLES } from "../lib/real-examples";

test("the phone hero's proof matches the real drafts exactly", () => {
  for (const [region, proof] of Object.entries(HERO_PROOFS)) {
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
