import assert from "node:assert/strict";
import test from "node:test";
import { buildTermWeather, matchDispositions } from "../lib/term-weather";

const T3 = { childName: "Aroha", termLabel: "Term 3 2026", termStart: "2026-07-20", termEnd: "2026-09-25" };

test("phrases the story writer produces map onto the known dispositions", () => {
  assert.deepEqual(matchDispositions("Perseverance"), ["perseverance"]);
  assert.deepEqual(matchDispositions("persisting with difficulty"), ["perseverance"]);
  assert.deepEqual(matchDispositions("kept trying after the tower fell"), ["perseverance"]);
  assert.deepEqual(matchDispositions("problem-solving"), ["problem solving"]);
  assert.deepEqual(matchDispositions("Safe risk-taking"), ["safe risk-taking"]);
  assert.deepEqual(matchDispositions("co-operation with peers"), ["collaboration"]);
  assert.deepEqual(matchDispositions("manaakitanga"), ["empathy"]);
  assert.deepEqual(matchDispositions("imaginative play"), ["creativity"]);
});

test("one phrase can carry two dispositions, and nonsense carries none", () => {
  assert.deepEqual(matchDispositions("curiosity and confidence").sort(), ["confidence", "curiosity"]);
  assert.deepEqual(matchDispositions("sat quietly"), []);
});

test("a disposition counts once per story, however many phrases name it", () => {
  const w = buildTermWeather({ ...T3, stories: [{ date: "2026-08-01", dispositions: ["perseverance", "persistence", "kept trying"] }] });
  assert.equal(w.weather[0].stories, 1);
});

test("only stories inside the term are counted", () => {
  const w = buildTermWeather({ ...T3, stories: [
    { date: "2026-07-10", dispositions: ["curiosity"] }, // holiday before
    { date: "2026-08-12", dispositions: ["curiosity"] },
    { date: "2026-10-01", dispositions: ["curiosity"] }, // holiday after
  ] });
  assert.equal(w.storiesInTerm, 1);
  assert.equal(w.weather[0].stories, 1);
});

test("patterns describe the spread across the term without scoring it", () => {
  const w = buildTermWeather({ ...T3, stories: [
    { date: "2026-07-22", dispositions: ["curiosity"] },
    { date: "2026-08-05", dispositions: ["curiosity"] },
    { date: "2026-09-10", dispositions: ["curiosity", "confidence"] },
    { date: "2026-09-15", dispositions: ["confidence"] },
    { date: "2026-09-20", dispositions: ["confidence"] },
    { date: "2026-07-25", dispositions: ["leadership"] },
  ] });
  const by = Object.fromEntries(w.weather.map((d) => [d.disposition, d]));
  assert.equal(by["confidence"].pattern, "growing");
  assert.match(by["confidence"].sentence, /more often later in the term/);
  assert.equal(by["leadership"].pattern, "once");
  assert.match(by["leadership"].sentence, /one story this term/);
});

test("unmatched phrases are kept as written, never forced into a category", () => {
  const w = buildTermWeather({ ...T3, stories: [{ date: "2026-08-01", dispositions: ["noticing small details", "curiosity"] }] });
  assert.deepEqual(w.alsoNoticed, ["noticing small details"]);
  assert.equal(w.weather.length, 1);
});

test("nothing is invented: no sentence claims a context the stories never recorded", () => {
  const w = buildTermWeather({ ...T3, stories: Array.from({ length: 8 }, (_, i) => ({
    date: `2026-08-${String(3 + i * 3).padStart(2, "0")}`, dispositions: ["perseverance"],
  })) });
  const everything = [w.summary, ...w.weather.map((d) => d.sentence)].join(" ");
  for (const invented of [/outdoor/i, /indoor/i, /after a fail/i, /with (friends|peers)/i, /at mat time/i]) {
    assert.ok(!invented.test(everything), `invented context: ${invented}`);
  }
});

test("no scores, grades or comparisons with other children", () => {
  const w = buildTermWeather({ ...T3, stories: [
    { date: "2026-08-01", dispositions: ["curiosity"] }, { date: "2026-08-20", dispositions: ["curiosity"] },
  ] });
  const everything = [w.summary, ...w.weather.map((d) => d.sentence)].join(" ");
  assert.ok(!/\d+\s*\/\s*\d+|%|score|grade|above|below|behind|ahead|average|compared/i.test(everything), everything);
});

test("empty and disposition-less terms say so plainly", () => {
  assert.match(buildTermWeather({ ...T3, stories: [] }).summary, /No stories about Aroha were saved in Term 3 2026/);
  assert.match(buildTermWeather({ ...T3, stories: [{ date: "2026-08-01", dispositions: [] }] }).summary, /none with learning dispositions recorded/);
});

test("the summary names the most frequent disposition for this child", () => {
  const w = buildTermWeather({ ...T3, stories: [
    { date: "2026-08-01", dispositions: ["creativity"] },
    { date: "2026-08-10", dispositions: ["creativity", "empathy"] },
  ] });
  assert.equal(w.summary, "Across 2 stories in Term 3 2026, creativity came up most often for Aroha.");
});
