import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { firstNameForButton, nextStoryCard, shouldOfferNextStory } from "../lib/next-story";
import { sanitizeEventMetadata } from "../lib/analytics/events";
import { storiesFromCounter, withoutStories } from "../lib/story-count";

// Proposal C (18 Nov 2026): the next story, right under the first.

const READY = { newAccount: true, notesSoFar: 1, hasStory: true, takenAway: true, started: false, walled: false };

test("the card shows under her first story once she has taken it away, and only then", () => {
  assert.equal(shouldOfferNextStory(READY), true);
  assert.equal(shouldOfferNextStory({ ...READY, takenAway: false }), false, "not before she copies, exports or saves it");
  assert.equal(shouldOfferNextStory({ ...READY, newAccount: false }), false, "an account that already had stories");
  assert.equal(shouldOfferNextStory({ ...READY, notesSoFar: 2 }), false, "a second note: the first story is behind her");
  assert.equal(shouldOfferNextStory({ ...READY, notesSoFar: 0 }), false);
  assert.equal(shouldOfferNextStory({ ...READY, hasStory: false }), false);
  assert.equal(shouldOfferNextStory({ ...READY, started: true }), false, "never twice on a page");
  assert.equal(shouldOfferNextStory({ ...READY, walled: true }), false, "never beside a wall");
});

test("her own story leads to the same child or another; the example leads to one of her own", () => {
  const own = nextStoryCard({ childName: "Mia Thompson", fromExample: false });
  assert.deepEqual(own.options.map((o) => [o.choice, o.label, o.primary]), [
    ["same", "Next moment for Mia", true],
    ["another", "Another child", false],
  ]);
  const unnamed = nextStoryCard({ childName: "", fromExample: false });
  assert.deepEqual(unnamed.options.map((o) => o.choice), ["another"]);
  const example = nextStoryCard({ childName: "Lily", fromExample: true });
  assert.deepEqual(example.options.map((o) => o.choice), ["another"], "never 'the next moment for' the example child");
  for (const card of [own, unnamed, example]) {
    const words = [card.heading, card.line, ...card.options.map((o) => o.label)].join(" ");
    assert.ok(!/[—–]/.test(words), "no dashes");
    assert.ok(words.length < 200, "short");
    assert.ok(!/pause|cancel|upgrade|price|\$/i.test(words), "no selling, no billing words");
  }
});

test("only a first name that looks like a name goes on a button", () => {
  assert.equal(firstNameForButton("  Aroha  Ngata "), "Aroha");
  assert.equal(firstNameForButton("Mia-Rose"), "Mia-Rose");
  assert.equal(firstNameForButton("O'Neill"), "O'Neill");
  assert.equal(firstNameForButton("Zoë"), "Zoë");
  for (const bad of ["", "   ", null, undefined, "<b>", "12", "A".repeat(21), "mia@x.nz"]) assert.equal(firstNameForButton(bad as string), "", String(bad));
});

test("the card's events carry the story id and the choice, nothing typed", () => {
  const id = "3f2b8c1e-9a4d-4c7b-8e21-6d5a0b9c1f42";
  assert.deepEqual(sanitizeEventMetadata("second_story_started", { story_id: id, child: "same", childName: "Mia" }), { story_id: id, child: "same" });
  assert.deepEqual(sanitizeEventMetadata("second_story_started", { child: "Mia" }), {});
  assert.deepEqual(sanitizeEventMetadata("second_story_offered", { story_id: id, note: "Mia built a tower" }), { story_id: id });
});

test("a zero story counter is never trusted to mean no stories", () => {
  assert.equal(storiesFromCounter(3), true);
  assert.equal(storiesFromCounter(0), null, "a zero is checked against the stories table");
  assert.equal(storiesFromCounter(null), null);
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(withoutStories(rows, new Set(["b"])).map((r) => r.id), ["a", "c"]);
  assert.deepEqual(withoutStories(rows, null), [], "unsure: nobody is told they have no stories");
});

test("the story page wires the card without touching the note box", () => {
  const page = readFileSync("app/(app)/generate/page.tsx", "utf8");
  assert.match(page, /<NextStoryCard /);
  assert.match(page, /offerNextStory\(\);\n {2}\};\n\n {2}const handleRegenerate/, "Copy offers it");
  assert.match(page, /onTakenAway=\{offerNextStory\}/, "a copied export pack offers it");
  assert.match(page, /accountData\?\.hasStories !== true/, "a new account is read from the stories table, not the counter alone");
  // Typing over the example keeps the input method at "sample" (the protected
  // note box), so the example is only the example while its words are unchanged.
  assert.match(page, /firstNoteWasExample\.current = method === "sample" && note === SAMPLE_OBSERVATION\.trim\(\);/);
  const me = readFileSync("app/api/me/route.ts", "utf8");
  assert.match(me, /accountHasStories\(/);
});
