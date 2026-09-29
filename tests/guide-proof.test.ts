import assert from "node:assert/strict";
import test from "node:test";
import { draftOpening, proofExample } from "../lib/guide-proof";

test("both curricula have their real example, with a note and a draft", () => {
  for (const framework of ["NZ", "AU"] as const) {
    const example = proofExample(framework);
    assert.ok(example, `${framework} example is missing from lib/real-examples.ts`);
    assert.equal(example.framework, framework);
    assert.ok(example.note.length > 20 && example.story.length > 200);
  }
});

test("the opening skips the title and label and keeps two paragraphs", () => {
  const nz = draftOpening(proofExample("NZ")!.story);
  assert.equal(nz.length, 2);
  assert.ok(nz[0].text.startsWith("Before going outside, Aroha"));
  assert.equal(nz[0].heading, null);
});

test("a section heading on its own line is kept as a heading, not run into the text", () => {
  const au = draftOpening(proofExample("AU")!.story);
  assert.equal(au.length, 2);
  assert.ok(au[0].text.startsWith("Jack sorted the bear counters"));
  assert.equal(au[1].heading, "What learning we noticed");
  assert.ok(au[1].text.startsWith("Jack used sorting"));
});
