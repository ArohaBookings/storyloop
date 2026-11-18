import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  checkInputProblem,
  checkMyStory,
  findCurriculumLinks,
  findFullNames,
  hasPhoneNumber,
  CHECK_NOTE_MAX,
  CHECK_STORY_MAX,
} from "../lib/check-my-story";
import { sampleQueue } from "../lib/sample-team";
import { REAL_EXAMPLES } from "../lib/real-examples";

/**
 * Check my story (19 Nov 2026): what a leader looks for, worked out from a
 * story and its note with the writer's own guards, no model, nothing stored.
 * These tests pin the four answers and, as important, the stories it must NOT
 * query: every real draft on the site and every sample story but the one made
 * to show a query.
 */

const status = (result: ReturnType<typeof checkMyStory>, id: string) => result.items.find((item) => item.id === id)?.status;
const detail = (result: ReturnType<typeof checkMyStory>, id: string) => result.items.find((item) => item.id === id)?.detail ?? "";

const NOTE = 'Mia at the water trough. Filled the big bucket, tipped it down the guttering. "It\'s going fast!" Tried the small bucket next.';
const GOOD = [
  "Mia, today you turned the long guttering by the water trough into a river. You filled the big bucket and watched the water race away.",
  '"It\'s going fast!" you called, and then you tried the small bucket to see what would change.',
  "",
  "Te Whāriki links",
  "This links with Mana aotūroa | Exploration because Mia tested an idea with two buckets.",
  "This links with Mana reo | Communication because Mia told us what she saw.",
].join("\n");

test("a story that keeps the note's words, links and names has nothing to query", () => {
  const result = checkMyStory({ story: GOOD, note: NOTE });
  assert.deepEqual(result.items.map((item) => item.id), ["child_words", "links", "names", "invented"]);
  assert.deepEqual(result.items.map((item) => item.status), ["ok", "ok", "ok", "ok"]);
  assert.equal(result.looks, 0);
  assert.equal(result.summary, "Nothing to query.");
});

test("the same story and note always give the same answer", () => {
  const bad = `${GOOD}\nMia Thompson said "I am the best builder in the whole world".`;
  assert.deepEqual(checkMyStory({ story: bad, note: NOTE }), checkMyStory({ story: bad, note: NOTE }));
});

test("the child's own words: kept, lost, or nothing to keep", () => {
  const lost = checkMyStory({ story: GOOD.replace('"It\'s going fast!" you called', "You said it was quick"), note: NOTE });
  assert.equal(status(lost, "child_words"), "look");
  assert.match(detail(lost, "child_words"), /word for word/);
  assert.match(detail(lost, "child_words"), /It's going fast!/);
  const noQuote = checkMyStory({ story: GOOD, note: "Mia filled the big bucket and tipped it down the guttering, then tried the small one." });
  assert.equal(status(noQuote, "child_words"), "none");
  const noNote = checkMyStory({ story: GOOD, note: "" });
  assert.equal(status(noNote, "child_words"), "none");
  assert.match(detail(noNote, "child_words"), /No note was saved/);
  assert.equal(status(noNote, "links"), "none", "with no note a link cannot be judged either way");
});

test("a curriculum link the note gives nothing to is worth a look; one it backs is not", () => {
  const story = `${GOOD}\nThis links with Mana atua | Wellbeing because Mia was calm and settled.`;
  const result = checkMyStory({ story, note: NOTE });
  assert.equal(status(result, "links"), "look");
  assert.match(detail(result, "links"), /Nothing in the note points to Mana atua \| Wellbeing/);
  assert.doesNotMatch(detail(result, "links"), /Exploration|Communication/);
  // The same link, once the note says what was seen.
  const backed = checkMyStory({ story, note: `${NOTE} Then she sat calmly for a rest.` });
  assert.equal(status(backed, "links"), "ok");
});

test("saved outcomes count as links, and a second child in the note backs contribution", () => {
  const result = checkMyStory({
    story: "Tui ran the hut door and let her friends in.",
    note: "Tui, Rawiri and Sam built a hut. Tui was in charge of the door.",
    outcomes: ["Contribution | Mana tangata"],
  });
  assert.equal(status(result, "links"), "ok");
  const missing = checkMyStory({ story: "Tui painted a long red line across the page and named it the road home for her cat.", note: "Tui painted a red line." });
  assert.equal(status(missing, "links"), "look");
  assert.match(detail(missing, "links"), /No curriculum link found/);
});

test("links are found by framework, and a bare strand word in a sentence is not a link", () => {
  const labels = (story: string, outcomes?: string[]) => findCurriculumLinks({ story, outcomes }).map((link) => link.label);
  assert.deepEqual(labels("This links with EYLF Outcome 3 because she showed strong wellbeing."), ["EYLF Outcome 3"]);
  assert.deepEqual(labels("She felt a real sense of belonging at mat time."), []);
  assert.deepEqual(labels("Te Whāriki links\n- Belonging"), ["Belonging"]);
  assert.deepEqual(labels("", ["Exploration | Mana aotūroa"]), ["Mana aotūroa | Exploration"]);
  assert.deepEqual(labels("Areas of learning: Communication and Language, Physical Development"), ["Communication and Language", "Physical Development"]);
  assert.deepEqual(labels("Aistear: Exploring and Thinking"), ["Exploring and Thinking"]);
});

test("first names only: a full name, an email or a phone number is worth a look", () => {
  assert.deepEqual(findFullNames("Today Mia Thompson and Theo Ruru built a hut.", "Mia and Theo built a hut"), ["Mia Thompson", "Theo Ruru"]);
  assert.deepEqual(findFullNames("Mia Te Rangi helped pack away.", "Mia helped"), ["Mia Te Rangi"]);
  // Not surnames: a heading in title case, a teacher's name, the curriculum, a possessive.
  assert.deepEqual(findFullNames("Mia And The Tower\n\nMia built it.", "Mia built a tower"), []);
  assert.deepEqual(findFullNames("Mia sang with Whaea Sue.", "Mia sang"), []);
  assert.deepEqual(findFullNames("Mia Te Whāriki links show it.", "Mia"), []);
  const named = checkMyStory({ story: `${GOOD}\nMia Thompson went home happy.`, note: NOTE });
  assert.equal(status(named, "names"), "look");
  assert.match(detail(named, "names"), /Mia Thompson/);
  assert.equal(status(checkMyStory({ story: `${GOOD}\nCall mum on 021 555 0123.`, note: NOTE }), "names"), "look");
  assert.equal(status(checkMyStory({ story: `${GOOD}\nEmail sam@example.com.`, note: NOTE }), "names"), "look");
  assert.equal(status(checkMyStory({ story: `${GOOD}\nShe has autism.`, note: NOTE }), "names"), "look", "the privacy guardian's high flags are a leader's question too");
});

test("a phone number is eight or more digits in a few groups, never a count or a year", () => {
  assert.equal(hasPhoneNumber("+64 21 555 0123"), true);
  assert.equal(hasPhoneNumber("(03) 555 1234"), true);
  assert.equal(hasPhoneNumber("0412-555-012"), true);
  assert.equal(hasPhoneNumber("counted 1, 2, 3, 4, 5, 6, 7, 8 blocks"), false);
  assert.equal(hasPhoneNumber("1 2 3 4 5 6 7 8"), false);
  assert.equal(hasPhoneNumber("on 19 November 2026 at 10:30"), false);
});

test("anything made up: quoted words the note never had, talk about the note, stock phrases", () => {
  const invented = checkMyStory({ story: `${GOOD}\n"I am the best builder in the whole world," she said.`, note: NOTE });
  assert.equal(status(invented, "invented"), "look");
  assert.match(detail(invented, "invented"), /not in the note: "I am the best builder in the whole world/);
  const meta = checkMyStory({ story: `${GOOD}\nThe note says Mia was happy.`, note: NOTE });
  assert.equal(status(meta, "invented"), "look");
  assert.match(detail(meta, "invented"), /talks about the note/);
  const stock = checkMyStory({ story: `${GOOD}\nIt was a remarkable moment.`, note: NOTE });
  assert.match(detail(stock, "invented"), /stock phrases: "remarkable"/);
  // An ordinary professional verb is the writer's own business, not a leader's query.
  assert.equal(status(checkMyStory({ story: `${GOOD}\nMia demonstrated care with the buckets.`, note: NOTE }), "invented"), "ok");
});

test("the sample team gets the same check, and only the story made to show a query has one", () => {
  for (const country of ["NZ", "AU"] as const) {
    const queue = sampleQueue(new Date("2026-11-19T00:00:00Z"), country);
    assert.equal(queue.length, 6);
    for (const item of queue) {
      assert.equal(item.check.items.length, 4, `${country} ${item.id} has the four answers`);
      if (item.id === "sample-story-6") {
        assert.equal(item.check.looks, 1, `${country} ${item.id}`);
        assert.equal(status(item.check, "invented"), "look");
      } else {
        assert.equal(item.check.looks, 0, `${country} ${item.id}: ${JSON.stringify(item.check.items)}`);
      }
    }
  }
});

test("every real draft on the site passes: no false queries on real StoryLoop stories", () => {
  assert.ok(REAL_EXAMPLES.length >= 10);
  for (const example of REAL_EXAMPLES) {
    const result = checkMyStory({ story: example.story, note: example.note, childName: example.childName });
    assert.equal(result.looks, 0, `${example.slug}: ${JSON.stringify(result.items.filter((item) => item.status === "look"))}`);
  }
});

test("pasted text is refused with a reason when there is nothing to check, and never cut", () => {
  assert.match(checkInputProblem("", "a note about Mia") ?? "", /Paste the whole learning story/);
  assert.match(checkInputProblem(GOOD, "") ?? "", /note it was written from/);
  assert.match(checkInputProblem("x".repeat(CHECK_STORY_MAX + 1), NOTE) ?? "", /very long/);
  assert.match(checkInputProblem(GOOD, "x".repeat(CHECK_NOTE_MAX + 1)) ?? "", /very long/);
  assert.equal(checkInputProblem(GOOD, NOTE), null);
  assert.equal(checkInputProblem(42, NOTE) !== null, true);
});

test("built from the writer's guards, with no model, no network and no storage", () => {
  const source = readFileSync(new URL("../lib/check-my-story.ts", import.meta.url), "utf8");
  assert.match(source, /from "@\/lib\/ai\/quality-guards"/);
  assert.match(source, /from "@\/lib\/privacy-guardian"/);
  for (const forbidden of ["fetch(", "openai", "anthropic", "@/lib/ai/generate", "supabase", "process.env"]) {
    assert.equal(source.toLowerCase().includes(forbidden), false, `lib/check-my-story.ts must not use ${forbidden}`);
  }
  const route = readFileSync(new URL("../app/api/check-my-story/route.ts", import.meta.url), "utf8");
  assert.match(route, /sec-fetch-site/);
  assert.match(route, /consumeRateLimit\(\{ scope: "public-check-my-story"/);
  assert.match(route, /public-check-my-story-global/);
  assert.equal(/console\.\w+\([^)]*body/.test(route), false, "the pasted text is never logged");
  assert.equal(/\.insert\(|\.upsert\(/.test(route), false, "nothing pasted is stored");
  assert.match(route, /metadata: \{ looks: check\.looks \}/, "the one thing kept is a count");
});
