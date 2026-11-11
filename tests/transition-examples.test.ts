import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TRANSITION_OUTCOMES } from "../lib/ai/transition-draft";
import { TRANSITION_EXAMPLES, TRANSITION_EXAMPLE_NOTES } from "../lib/transition-examples";
import { filmVariantForZone } from "../lib/home-film";

test("the worked example's notes are the sample notes the drafter offers on the same page", () => {
  const demo = readFileSync(new URL("../components/marketing/TransitionDemo.tsx", import.meta.url), "utf8");
  const sample = demo.match(/const SAMPLE =\s*\n?\s*"((?:[^"\\]|\\.)*)";/);
  assert.ok(sample, "SAMPLE is still in TransitionDemo");
  assert.equal(JSON.parse(`"${sample![1]}"`), TRANSITION_EXAMPLE_NOTES);
});

test("every curriculum has a full example, with its own outcome names in order", () => {
  for (const framework of ["EYLF", "VEYLDF", "QKLG", "TW"] as const) {
    const example = TRANSITION_EXAMPLES[framework];
    assert.deepEqual(example.outcomes.map((o) => o.outcome), [...TRANSITION_OUTCOMES[framework]]);
    for (const outcome of example.outcomes) assert.ok(outcome.seen || outcome.gap, `${framework} ${outcome.outcome} says something`);
    assert.ok(example.checks.length > 0, `${framework} lists what to check`);
  }
});

test("the example quotes the child only in words that are in the notes", () => {
  for (const example of Object.values(TRANSITION_EXAMPLES)) {
    for (const outcome of example.outcomes) {
      for (const quote of `${outcome.seen} ${outcome.strategy}`.match(/"[^"]{3,}"/g) ?? []) {
        assert.ok(TRANSITION_EXAMPLE_NOTES.includes(quote.slice(1, -1).replace(/[.,]$/, "")), `${quote} is in the notes`);
      }
    }
  }
});

test("Aotearoa gets the Te Whāriki film and everybody else the EYLF one", () => {
  assert.equal(filmVariantForZone("Pacific/Auckland"), "nz");
  assert.equal(filmVariantForZone("Australia/Sydney"), "au");
  assert.equal(filmVariantForZone("Europe/London"), "au");
  assert.equal(filmVariantForZone(undefined), "au");
});
