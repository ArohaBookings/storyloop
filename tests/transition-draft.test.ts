import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSITION_OUTCOMES,
  buildTransitionUserMessage,
  normaliseTransitionDraft,
} from "../lib/ai/transition-draft";

const notes =
  "Arlo (4). After drop-off he goes straight to water the veggie garden. Built a marble run for about 25 minutes and said \"it needs to go steeper\", then raised one end and tried again.";
const params = { notes, childName: "Arlo", framework: "VEYLDF" as const, mode: "transition" as const };

test("always returns the five outcomes for the framework, in order", () => {
  const draft = normaliseTransitionDraft({ outcomes: [] }, params);
  assert.deepEqual(draft.outcomes.map((o) => o.outcome), [...TRANSITION_OUTCOMES.VEYLDF]);
  for (const o of draft.outcomes) {
    assert.equal(o.seen, "");
    assert.equal(o.strategy, "");
    assert.ok(o.gap.length > 0, "an empty outcome tells the educator what to add, never invents");
  }
});

test("keeps a quote that is in the notes, and unquotes and flags one that is not", () => {
  const draft = normaliseTransitionDraft(
    {
      outcomes: [
        { outcome: "Identity", seen: "Arlo settles with a job.", strategy: "Give him a morning job.", gap: "" },
        { outcome: "Community", seen: "Arlo said \"I love my friends\" at mat time.", strategy: "Pair him with a buddy.", gap: "" },
        { outcome: "Wellbeing", seen: "", strategy: "", gap: "Add a moment about rest." },
        { outcome: "Learning", seen: "Arlo said \"it needs to go steeper\" and tried again.", strategy: "Offer ramps.", gap: "" },
        { outcome: "Communication", seen: "", strategy: "should be dropped", gap: "" },
      ],
      checks: ["Confirm the marble run timing."],
    },
    params,
  );
  assert.match(draft.outcomes[3].seen, /"it needs to go steeper"/);
  assert.doesNotMatch(draft.outcomes[1].seen, /"/, "an invented quote loses its quotation marks");
  assert.ok(draft.checks.some((c) => /I love my friends/.test(c)), "and becomes a check for the educator");
  assert.equal(draft.outcomes[4].strategy, "", "no strategy without something seen");
  assert.ok(draft.outcomes[4].gap.length > 0);
  assert.ok(draft.checks.includes("Confirm the marble run timing."));
});

test("flags diagnosis words the notes never used", () => {
  const draft = normaliseTransitionDraft(
    { outcomes: [{ outcome: "Identity", seen: "Arlo may have ADHD and a developmental delay.", strategy: "Refer him.", gap: "" }] },
    params,
  );
  assert.ok(draft.checks.some((c) => /ADHD/.test(c)));
  assert.ok(draft.checks.some((c) => /"delay"/i.test(c)));
});

test("flags the labels and deficit wording the review found missing", () => {
  const draft = normaliseTransitionDraft(
    { outcomes: [{ outcome: "Identity", seen: "Arlo is anxious, may be neurodivergent, has a speech delay and struggles behind his peers.", strategy: "ok", gap: "" }] },
    params,
  );
  for (const word of ["anxious", "neurodivergent", "delay", "struggles", "behind his peers"]) {
    assert.ok(draft.checks.some((c) => c.toLowerCase().includes(word)), word);
  }
});

test("quote guard: single, curly-single and guillemet quotes; whole words only; apostrophes are not quotes", () => {
  const notes2 = "Arlo was very determined. Arlo's dad dropped him off. He said 'I am the wolf'.";
  const p2 = { ...params, notes: notes2 };
  const d = normaliseTransitionDraft(
    {
      outcomes: [
        { outcome: "Identity", seen: "Arlo said ‘I love my friends’ and 'mine'.", strategy: "ok", gap: "" },
        { outcome: "Community", seen: "Arlo said «I am the wolf» and Arlo's dad waved.", strategy: "ok", gap: "" },
        { outcome: "Wellbeing", seen: "Arlo said “mine” at lunch.", strategy: "ok", gap: "" },
      ],
    },
    p2,
  );
  assert.doesNotMatch(d.outcomes[0].seen, /[‘’']I love/);
  assert.ok(d.checks.some((c) => /I love my friends/.test(c)));
  assert.ok(d.checks.some((c) => /"mine"/.test(c)), "'mine' is inside 'determined', not a word in the notes");
  assert.match(d.outcomes[1].seen, /"I am the wolf"/);
  assert.match(d.outcomes[1].seen, /Arlo's dad/, "an apostrophe is left alone");
  assert.doesNotMatch(d.outcomes[2].seen, /“mine”|"mine"/);
});

test("a missing or reordered row never lands under the wrong outcome", () => {
  const d = normaliseTransitionDraft(
    {
      outcomes: [
        { outcome: "Identity", seen: "I1.", strategy: "s", gap: "" },
        { outcome: "Community", seen: "C1.", strategy: "s", gap: "" },
        // Wellbeing skipped
        { outcome: "Learning", seen: "L1.", strategy: "s", gap: "" },
        { outcome: "Communication", seen: "M1.", strategy: "s", gap: "" },
      ],
    },
    params,
  );
  assert.deepEqual(d.outcomes.map((o) => o.seen), ["I1.", "C1.", "", "L1.", "M1."]);
  const tw = normaliseTransitionDraft(
    {
      outcomes: [
        { outcome: "Mana whenua | Belonging", seen: "B.", strategy: "s", gap: "" },
        { outcome: "Mana atua | Wellbeing", seen: "W.", strategy: "s", gap: "" },
        { outcome: "Mana tangata", seen: "C.", strategy: "s", gap: "" },
        { outcome: "Mana reo", seen: "R.", strategy: "s", gap: "" },
        { outcome: "Mana aotūroa", seen: "E.", strategy: "s", gap: "" },
      ],
    },
    { ...params, framework: "TW" },
  );
  assert.deepEqual(tw.outcomes.map((o) => o.seen), ["W.", "B.", "C.", "R.", "E."]);
});

test("en dash ranges survive; em dashes do not", () => {
  const d = normaliseTransitionDraft({ outcomes: [{ outcome: "Identity", seen: "Arlo built for 20–25 minutes — then rested.", strategy: "ok", gap: "" }] }, params);
  assert.match(d.outcomes[0].seen, /20–25 minutes, then rested/);
});

test("does not flag a word the educator wrote", () => {
  const withDiagnosis = { ...params, notes: `${notes} The family has shared an autism diagnosis.` };
  const draft = normaliseTransitionDraft(
    { outcomes: [{ outcome: "Identity", seen: "The family has shared an autism diagnosis; Arlo settles with a job.", strategy: "Keep the morning job.", gap: "" }] },
    withDiagnosis,
  );
  assert.ok(!draft.checks.some((c) => /autism/i.test(c)));
});

test("removes em dashes and caps length", () => {
  const draft = normaliseTransitionDraft(
    { outcomes: [{ outcome: "Identity", seen: `Arlo settles — with a job. ${"x".repeat(900)}`, strategy: "ok", gap: "" }] },
    params,
  );
  assert.doesNotMatch(draft.outcomes[0].seen, /—/);
  assert.ok(draft.outcomes[0].seen.length <= 420);
});

test("the request names the statement, the outcomes and the notes", () => {
  const message = buildTransitionUserMessage(params);
  assert.match(message, /TLDS/);
  assert.match(message, /Identity; Community; Wellbeing; Learning; Communication/);
  assert.match(message, /it needs to go steeper/);
  const summary = buildTransitionUserMessage({ ...params, framework: "TW", mode: "summary" });
  assert.match(summary, /Mana atua/);
  assert.match(summary, /end-of-year/);
});
