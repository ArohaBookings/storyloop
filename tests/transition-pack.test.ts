import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTransitionPack,
  cleanDestination,
  defaultPackSelection,
  MAX_PACK_STORIES,
  packStoryFromRow,
  resolvePackSelection,
  type PackStory,
} from "../lib/transition-pack";

const child = {
  name: "Aroha",
  interests: ["Diggers", " water play ", ""],
  homeLanguages: ["te reo Māori", "English"],
  whanauAspirations: "We want her to feel proud of who she is.",
};

function story(id: string, date: string, extra: Partial<PackStory> = {}): PackStory {
  return {
    id,
    date,
    title: `Story ${id}`,
    learningSummary: `Summary ${id}`,
    childVoice: null,
    whanauVoice: null,
    dispositions: [],
    nextSteps: [],
    ...extra,
  };
}

test("rows are read like the Learning Loop panel: saved progress wins over generated next steps", () => {
  const withProgress = packStoryFromRow({
    id: "a",
    date: "2026-09-01",
    next_steps: ["Offer longer pipes"],
    metadata: {
      storyTitle: "The long pipe",
      learningSummary: "Tested how water travels.",
      childVoice: "It goes  faster down!",
      learningDispositions: ["Curiosity", 4, ""],
      nextStepProgress: [
        { text: "Offer longer pipes", status: "tried" },
        { text: "Add a funnel", status: "continue" },
        { text: "  ", status: "planned" },
        { text: "Invite a friend", status: "weird" },
      ],
    },
  });
  assert.equal(withProgress.title, "The long pipe");
  // The child's words are kept exactly, double space and all.
  assert.equal(withProgress.childVoice, "It goes  faster down!");
  assert.deepEqual(withProgress.dispositions, ["Curiosity"]);
  assert.deepEqual(withProgress.nextSteps, [
    { text: "Offer longer pipes", status: "tried" },
    { text: "Add a funnel", status: "continue" },
    { text: "Invite a friend", status: "planned" },
  ]);

  const withoutProgress = packStoryFromRow({ id: "b", date: "2026-09-02", next_steps: ["Offer longer pipes", 3], metadata: null });
  assert.deepEqual(withoutProgress.nextSteps, [{ text: "Offer longer pipes", status: "planned" }]);
  assert.equal(withoutProgress.title, null);
  assert.equal(withoutProgress.whanauVoice, null);
});

test("default selection is the most recent stories that have something to say", () => {
  const stories = [
    story("old", "2026-02-01"),
    story("empty", "2026-09-10", { learningSummary: "  ", childVoice: null }),
    ...Array.from({ length: 7 }, (_, i) => story(`s${i}`, `2026-08-0${i + 1}`)),
  ];
  const ids = defaultPackSelection(stories);
  assert.equal(ids.length, MAX_PACK_STORIES);
  assert.ok(!ids.includes("empty"));
  assert.ok(!ids.includes("old"));
  assert.deepEqual(ids, ["s6", "s5", "s4", "s3", "s2", "s1"]);
});

test("a requested selection only keeps this child's stories and drops the oldest past the limit", () => {
  const stories = Array.from({ length: 8 }, (_, i) => story(`s${i}`, `2026-08-1${i}`));
  assert.deepEqual(resolvePackSelection(stories, ["s1", "not-theirs"]), { ids: ["s1"], trimmed: false });
  assert.deepEqual(resolvePackSelection(stories, []), { ids: [], trimmed: false });

  const all = resolvePackSelection(stories, stories.map((s) => s.id));
  assert.equal(all.trimmed, true);
  assert.deepEqual(all.ids, ["s7", "s6", "s5", "s4", "s3", "s2"]);

  // No request at all means the default, not an empty pack.
  assert.equal(resolvePackSelection(stories, null).ids.length, MAX_PACK_STORIES);
});

test("the pack is assembled only from what was recorded, oldest moment first", () => {
  const stories = [
    story("late", "2026-09-05", {
      childVoice: "Look, I made a bridge!",
      whanauVoice: "She talks about the bridge every night.",
      dispositions: ["Curiosity", "perseverance"],
      nextSteps: [
        { text: "Offer planks of different lengths", status: "planned" },
        { text: "Photograph the bridge", status: "tried" },
      ],
    }),
    story("early", "2026-06-01", {
      whanauVoice: "We want her to feel proud of who she is.",
      dispositions: ["curious about insects"],
      nextSteps: [{ text: "Offer planks of different lengths", status: "continue" }],
    }),
    story("unchosen", "2026-07-01", { childVoice: "Not in the pack", dispositions: ["Leadership"] }),
  ];
  const pack = buildTransitionPack({ child, stories, selectedIds: ["late", "early"], audience: "teacher", destination: "  Te Kura o Ōwairaka  " });

  assert.equal(pack.eyebrow, "Transition pack");
  assert.equal(pack.title, "Aroha");
  assert.equal(pack.destinationLine, "Prepared for Te Kura o Ōwairaka.");
  assert.deepEqual(pack.moments.map((m) => m.id), ["early", "late"]);
  assert.equal(pack.moments[1].childVoice, "Look, I made a bridge!");
  // Aspirations and a story reply that repeat each other appear once.
  assert.deepEqual(pack.familyWords, [
    "We want her to feel proud of who she is.",
    "She talks about the bridge every night.",
  ]);
  assert.deepEqual(pack.languages, ["te reo Māori", "English"]);
  assert.deepEqual(pack.loves, ["Diggers", "water play"]);
  assert.deepEqual(pack.learns, [
    "Curiosity came through in both moments.",
    "Also in one moment: perseverance.",
  ]);
  // Tried steps are finished; a step planned twice is handed on once.
  assert.deepEqual(pack.pickUp, ["Offer planks of different lengths"]);
  assert.ok(!JSON.stringify(pack).includes("Not in the pack"));
  assert.ok(!JSON.stringify(pack).includes("Leadership"));
});

test("the family version speaks to the family and never promises contact on the educator's behalf", () => {
  const pack = buildTransitionPack({ child, stories: [story("a", "2026-09-01")], selectedIds: ["a"], audience: "family", destination: "" });
  assert.equal(pack.eyebrow, "A learning journey");
  assert.equal(pack.title, "Aroha");
  assert.equal(pack.destinationLine, null);
  assert.equal(pack.headings.family, "In your own words");
  assert.equal(pack.closing, "Thank you for sharing Aroha with us.");

  const teacher = buildTransitionPack({ child, stories: [], selectedIds: [], audience: "teacher" });
  assert.equal(teacher.closing, "Please don't start from zero. Aroha arrives already knowing a great deal.");
  assert.deepEqual(teacher.moments, []);
  assert.deepEqual(teacher.learns, []);
});

test("nothing past the story limit leaks in, even if the caller passes more ids", () => {
  const stories = Array.from({ length: 9 }, (_, i) => story(`s${i}`, `2026-08-1${i}`));
  const pack = buildTransitionPack({ child, stories, selectedIds: stories.map((s) => s.id), audience: "teacher" });
  assert.equal(pack.moments.length, MAX_PACK_STORIES);
});

test("dispositions seen once are gathered into one line so the repeated ones stand out", () => {
  const stories = [
    story("a", "2026-05-01", { dispositions: ["Perseverance", "Curiosity"] }),
    story("b", "2026-06-01", { dispositions: ["persistence", "Leadership"] }),
    story("c", "2026-07-01", { dispositions: ["manaakitanga", "working theories"] }),
  ];
  const pack = buildTransitionPack({ child, stories, selectedIds: ["a", "b", "c"], audience: "teacher" });
  assert.deepEqual(pack.learns, [
    "Perseverance came through in 2 of these 3 moments.",
    "Also in one moment: curiosity, empathy, leadership and working theories.",
  ]);

  const single = buildTransitionPack({ child, stories, selectedIds: ["a"], audience: "teacher" });
  assert.deepEqual(single.learns, ["Curiosity and perseverance came through in this moment."]);

  const allOnce = buildTransitionPack({ child, stories, selectedIds: ["b", "c"], audience: "teacher" });
  assert.deepEqual(allOnce.learns, ["Each in one moment: empathy, leadership, perseverance and working theories."]);
});

test("destinations are tidied and bounded", () => {
  assert.equal(cleanDestination("  Ponsonby   Primary\n School "), "Ponsonby Primary School");
  assert.equal(cleanDestination("   "), null);
  assert.equal(cleanDestination(42), null);
  assert.equal(cleanDestination("x".repeat(200))?.length, 80);
});

test("a nameless child still reads as a sentence", () => {
  const pack = buildTransitionPack({ child: { ...child, name: "  " }, stories: [], selectedIds: [], audience: "teacher" });
  assert.equal(pack.title, "This child");
});
