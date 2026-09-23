import assert from "node:assert/strict";
import test from "node:test";
import { childNote, positionInNote, ruleSplit, sentencesFor, verbatimFragments } from "../lib/ai/group-split";

const NOTE = "Grace spent nearly 40 minutes on the marble run this morning. When it worked she called out “Look, it goes all the way now!” Harvey came over and wanted to add his car. Grace showed him where to put it at the top. They took turns for the rest of the session.";

test("only fragments that are in the note, word for word, survive", () => {
  const kept = verbatimFragments(NOTE, [
    "Harvey came over and wanted to add his car.",
    "Harvey was excited to join in.", // invented
    "When it worked she called out \"Look, it goes all the way now!\"", // straight quotes still match
    "Harvey came over and wanted to add his car.", // duplicate
    42,
    "", // empty
  ]);
  assert.deepEqual(kept, [
    "When it worked she called out \"Look, it goes all the way now!\"",
    "Harvey came over and wanted to add his car.",
  ]);
  assert.equal(positionInNote(NOTE, "Harvey was excited"), -1);
  assert.deepEqual(verbatimFragments(NOTE, "not a list"), []);
});

test("clauses expand to their whole sentences, once each, in note order", () => {
  const sentences = sentencesFor(NOTE, ["on the marble run this morning", "Grace spent nearly 40 minutes", "put it at the top"]);
  assert.deepEqual(sentences, [
    "Grace spent nearly 40 minutes on the marble run this morning.",
    "Grace showed him where to put it at the top.",
  ]);
});

test("each child's note is their sentences plus the shared scene, all the educator's words", () => {
  const split = {
    source: "ai" as const,
    shared: ["on the marble run this morning."],
    children: [
      { name: "Grace", fragments: ["Grace spent nearly 40 minutes on the marble run this morning.", "Grace showed him where to put it at the top."] },
      { name: "Harvey", fragments: ["Harvey came over and wanted to add his car.", "They took turns for the rest of the session."] },
      { name: "Mia", fragments: [] },
    ],
  };
  const harvey = childNote(NOTE, split, "Harvey");
  assert.equal(harvey, "Grace spent nearly 40 minutes on the marble run this morning. Harvey came over and wanted to add his car. They took turns for the rest of the session.");
  for (const sentence of harvey.split(/(?<=[.!])\s/)) assert.ok(positionInNote(NOTE, sentence) >= 0, sentence);
  assert.equal(childNote(NOTE, split, "Grace").includes("this morning. on the marble"), false, "no repeated clause");
  assert.equal(childNote(NOTE, split, "Mia"), "", "nothing in the note about Mia, so no note");
});

test("the rule-based split gives each child the sentences that name them", () => {
  const split = ruleSplit("Tui built a hut. Sam said banana. The crates were heavy.", ["Tui", "Sam"]);
  assert.deepEqual(split.children.map((c) => c.fragments), [["Tui built a hut."], ["Sam said banana."]]);
  assert.deepEqual(split.shared, ["The crates were heavy."]);
  // A name inside another word does not count.
  assert.deepEqual(ruleSplit("Samantha painted.", ["Sam"]).children[0].fragments, []);
});
