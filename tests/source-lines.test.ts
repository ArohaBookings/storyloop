import assert from "node:assert/strict";
import test from "node:test";
import { SECTION_HEADINGS } from "../components/app/StoryText";
import { contentWords, matchSources, noteUnits, observationSentences, splitSentences } from "../lib/source-lines";

// Where each line came from (A4, 25 Nov 2026): the matcher's rules.

const NOTE = "Tama at the sandpit, filled the red bucket with the scoop.\nSaid \"more sand\" when it was empty.\nCarried it to the water trough and watched it sink.";
const story = (obs: string, extra = "") => `More sand\n\nLearning Story\n${obs}\n\nWhat learning we noticed\nTama was testing what sand does in water.${extra}\n\nWhere to next / Responding\nWe will add jugs.`;
const obs = (text: string, note = NOTE, childName = "Tama") => observationSentences(matchSources({ note, text: story(text), kind: "story", childName }));

test("note units: each line, and each sentence of a line, numbered in order", () => {
  assert.deepEqual(noteUnits("one thing\n\nTwo. Three things here.\n- four"), ["one thing", "Two.", "Three things here.", "four"]);
  assert.deepEqual(noteUnits(""), []);
});

test("sentences: a quote and its speaker stay together", () => {
  assert.deepEqual(splitSentences("\"Look, pink!\" he said. Then he left."), ["\"Look, pink!\" he said.", "Then he left."]);
  assert.deepEqual(splitSentences("\"Too much!\" Tane laughed. He poured again."), ["\"Too much!\" Tane laughed.", "He poured again."]);
});

test("a sentence copied from the note is backed by that line", () => {
  const [s] = obs("Tama carried it to the water trough and watched it sink.");
  assert.equal(s.status, "backed");
  assert.deepEqual(s.sources, [3]);
});

test("a sentence sharing only the child's name is not in the note", () => {
  const [s] = obs("Tama rode his bike around the track.");
  assert.equal(s.status, "unbacked");
  assert.deepEqual(s.sources, []);
});

test("a quote that is not in the note is not in the note, however much else matches", () => {
  const [s] = obs("At the sandpit Tama filled the red bucket with the scoop and said \"more water please\".");
  assert.equal(s.status, "unbacked");
  const [kept] = obs("When the bucket was empty Tama said \"more sand\".");
  assert.equal(kept.status, "backed");
  assert.deepEqual(kept.sources, [2]);
});

test("the reading sections are never marked, and the educator's reading inside the observation is not flagged", () => {
  const result = matchSources({ note: NOTE, text: story("Tama filled the red bucket with the scoop.", " He was building a theory about weight."), kind: "story", childName: "Tama" });
  const reading = result.blocks.filter((b) => b.type === "para" && !b.observation).flatMap((b) => (b.type === "para" ? b.sentences : []));
  assert.ok(reading.length >= 2);
  assert.ok(reading.every((s) => s.status === "reading" && s.sources.length === 0));
  const [cue] = obs("Tama was showing real persistence.");
  assert.equal(cue.status, "reading");
});

test("macron words match the same word without macrons", () => {
  assert.deepEqual([...contentWords("whānau")], [...contentWords("whanau")]);
  const [s] = obs("Aroha sang the waiata with her whanau.", "Aroha sang the waiata with her whānau at the hui");
  assert.equal(s.status, "backed");
});

test("an empty note: every observation sentence is not in the note", () => {
  const sentences = obs("Tama filled the bucket. He carried it to the trough.", "");
  assert.equal(sentences.length, 2);
  assert.ok(sentences.every((s) => s.status === "unbacked"));
});

test("deterministic: the same input twice gives the same answer", () => {
  const input = { note: NOTE, text: story("Tama filled the red bucket. He watched it sink in the water trough."), kind: "story" as const, childName: "Tama" };
  assert.deepEqual(matchSources(input), matchSources(input));
});

test("a statement is all observation, one sentence at a time", () => {
  const result = matchSources({ note: NOTE, text: "He filled the red bucket with the scoop. He also climbed the fort.", kind: "statement", childName: "Tama" });
  const sentences = observationSentences(result);
  assert.deepEqual(sentences.map((s) => s.status), ["backed", "unbacked"]);
});

test("a story with no headings: everything after the title is observation", () => {
  const sentences = observationSentences(matchSources({ note: NOTE, text: "More sand\n\nTama filled the red bucket with the scoop.", kind: "story" }));
  assert.equal(sentences.length, 1);
  assert.equal(sentences[0].status, "backed");
});

test("every heading StoryText styles is a section the matcher knows", () => {
  for (const heading of SECTION_HEADINGS) {
    const text = `Title\n\nLearning Story\nTama filled the red bucket with the scoop.\n\n${heading}\nTama rode a bike.`;
    const blocks = matchSources({ note: NOTE, text, kind: "story" }).blocks;
    if (heading === "learning story") continue;
    assert.ok(blocks.some((b) => b.type === "heading" && b.text.toLowerCase() === heading), heading);
    const after = blocks[blocks.length - 1];
    assert.ok(after.type === "para" && !after.observation, `${heading} is a reading section`);
  }
});

test("counts only: sentences, backed and not in the note, the same sentences the page marks, no text (MERGE2 2d)", async () => {
  const { sourceCounts, sourcePiecesOfView } = await import("../lib/source-lines");
  const text = story("Tama carried it to the water trough and watched it sink. Tama rode his bike around the track.");
  const counts = sourceCounts(sourcePiecesOfView({ kind: "story", note: NOTE, story: text, childName: "Tama" }));
  assert.deepEqual(counts, { sentences: 2, backed: 1, not_backed: 1 });
  assert.deepEqual(Object.keys(counts).sort(), ["backed", "not_backed", "sentences"]);
  for (const value of Object.values(counts)) assert.equal(typeof value, "number");
  // A set: every "What I saw" line of every piece; an empty one or a missing note counts as nothing.
  const set = sourcePiecesOfView({ kind: "set", items: [
    { note: NOTE, childName: "Tama", draft: { outcomes: [{ seen: "Tama filled the red bucket with the scoop." }, { seen: null }] } },
    { note: "", childName: "Ari", draft: { outcomes: [{ seen: "Ari sang." }] } },
  ] });
  assert.equal(set.length, 2);
  assert.deepEqual(sourceCounts(set), { sentences: 1, backed: 1, not_backed: 0 });
  assert.deepEqual(sourceCounts([]), { sentences: 0, backed: 0, not_backed: 0 });
});
