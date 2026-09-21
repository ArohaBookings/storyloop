import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidencePack, thinCoverageFor, type EvidenceStory } from "../lib/evidence-pack";

const PERIOD = { periodLabel: "Term 3 2026", periodStart: "2026-07-20", periodEnd: "2026-09-25" };

const story = (id: string, childId: string | null, date: string, extra: Partial<EvidenceStory> = {}): EvidenceStory => ({
  id, childId, date, title: null, summary: null, outcomes: [], dispositions: [], nextSteps: [], reflection: null, familyVoice: null, ...extra,
});

test("coverage counts each child and names the ones nobody has written about", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }, { id: "c2", name: "Ben" }, { id: "c3", name: "Cleo" }],
    stories: [
      story("s1", "c1", "2026-08-01"),
      story("s2", "c1", "2026-09-02"),
      story("s3", "c2", "2026-08-15"),
    ],
  });
  assert.equal(pack.storyCount, 3);
  assert.equal(pack.childCount, 3);
  // Thinnest first, so the leader reads the problem before the praise.
  assert.deepEqual(pack.coverage.map((row) => [row.name, row.stories, row.status]), [
    ["Cleo", 0, "none"],
    ["Ben", 1, "thin"],
    ["Aroha", 2, "covered"],
  ]);
  assert.equal(pack.coverage.find((row) => row.name === "Aroha")!.lastDate, "2026-09-02");
  assert.ok(pack.gaps[0].includes("Cleo"), pack.gaps[0]);
  assert.ok(pack.gaps[1].includes("Ben"), pack.gaps[1]);
});

test("stories outside the period are not counted as evidence for it", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }],
    stories: [
      story("before", "c1", "2026-07-19"),
      story("inside", "c1", "2026-07-20"),
      story("inside2", "c1", "2026-09-25"),
      story("after", "c1", "2026-09-26"),
    ],
  });
  assert.equal(pack.storyCount, 2);
  assert.equal(pack.coverage[0].lastDate, "2026-09-25");
});

test("the planning cycle counts a next step revisited, not merely written", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }],
    stories: [
      story("s1", "c1", "2026-08-01", { title: "The long pipe", nextSteps: [{ text: "Offer longer pipes", status: "planned" }] }),
      story("s2", "c1", "2026-08-10", { title: "Water again", nextSteps: [{ text: "Offer longer pipes", status: "tried" }] }),
      story("s3", "c1", "2026-08-20", { title: "No plan here" }),
    ],
  });
  assert.equal(pack.cycle.withNextSteps, 2);
  assert.equal(pack.cycle.revisited, 1);
  assert.equal(pack.cycle.openNow, 1, "a planned step still open is worth showing");
  assert.deepEqual(pack.cycle.examples, [{ story: "Water again", step: "Offer longer pipes", status: "tried" }]);
  assert.ok(pack.gaps.some((gap) => /1 story with no next step/.test(gap)), JSON.stringify(pack.gaps));
});

test("reflection and family voice are reported where they are recorded, and flagged where they are not", () => {
  const withBoth = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }],
    stories: [
      story("s1", "c1", "2026-08-01", { title: "Pipes", reflection: "I stood back longer than I wanted to.", familyVoice: "Nana said he does this at home." }),
      story("s2", "c1", "2026-08-02", { title: "Blank", reflection: "   ", familyVoice: "" }),
    ],
  });
  assert.equal(withBoth.reflection.count, 1, "whitespace is not a reflection");
  assert.equal(withBoth.family.count, 1);
  assert.deepEqual(withBoth.reflection.examples, [{ story: "Pipes", text: "I stood back longer than I wanted to." }]);
  assert.deepEqual(withBoth.family.examples, [{ story: "Pipes", text: "Nana said he does this at home." }]);

  const withNeither = buildEvidencePack({ ...PERIOD, children: [{ id: "c1", name: "Aroha" }], stories: [story("s1", "c1", "2026-08-01")] });
  assert.ok(withNeither.gaps.some((gap) => /No educator reflection/.test(gap)), JSON.stringify(withNeither.gaps));
  assert.ok(withNeither.gaps.some((gap) => /No family voice/.test(gap)), JSON.stringify(withNeither.gaps));
});

test("curriculum links are counted once per story, commonest first", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }, { id: "c2", name: "Ben" }],
    stories: [
      story("s1", "c1", "2026-08-01", { outcomes: ["Exploration", "Exploration", "Communication"] }),
      story("s2", "c2", "2026-08-02", { outcomes: ["Exploration", " Belonging "] }),
    ],
  });
  assert.deepEqual(pack.curriculum, [
    { link: "Exploration", stories: 2 },
    { link: "Belonging", stories: 1 },
    { link: "Communication", stories: 1 },
  ]);
});

test("an empty period says so once, and never invents evidence", () => {
  const pack = buildEvidencePack({ ...PERIOD, children: [{ id: "c1", name: "Aroha" }], stories: [] });
  assert.equal(pack.storyCount, 0);
  assert.deepEqual(pack.cycle.examples, []);
  assert.deepEqual(pack.strengths, []);
  assert.equal(pack.gaps.filter((gap) => /No stories were saved/.test(gap)).length, 1);
  // No stories means no reflection and no family voice, but saying that three
  // times over is noise, not evidence.
  assert.ok(!pack.gaps.some((gap) => /No educator reflection|No family voice/.test(gap)), JSON.stringify(pack.gaps));
});

test("it counts, it does not judge: no child is scored, rated or compared", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }, { id: "c2", name: "Ben" }],
    stories: [story("s1", "c1", "2026-08-01", { outcomes: ["Exploration"] })],
  });
  const text = JSON.stringify(pack);
  assert.ok(!/\b(behind|ahead|delayed|concern|at risk|poor|weak|below|underperform)\b/i.test(text), text);
  // The gap is about the documentation, not the child.
  assert.ok(pack.gaps.some((gap) => /no story recorded this period: Ben/.test(gap)), JSON.stringify(pack.gaps));
});

test("strengths are only claimed where the records actually show them", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }],
    stories: [
      story("s1", "c1", "2026-08-01", { title: "One", outcomes: ["Exploration"], nextSteps: [{ text: "More water", status: "continue" }], reflection: "Noted." }),
      story("s2", "c1", "2026-08-08", { title: "Two", outcomes: ["Wellbeing"] }),
    ],
  });
  assert.ok(pack.strengths.some((line) => line === `1 child with ${pack.thinCoverage} or more stories this period.`), JSON.stringify(pack.strengths));
  assert.ok(pack.strengths.some((line) => /1 story where a next step was revisited/.test(line)));
  assert.ok(pack.strengths.some((line) => /1 story carrying an educator reflection/.test(line)));
  assert.ok(!pack.strengths.some((line) => /family/.test(line)), "no family voice was recorded, so none is claimed");
  assert.ok(pack.strengths.some((line) => /2 curriculum links/.test(line)));
});

test("a story with no child attached still counts for the period, but for nobody's coverage", () => {
  const pack = buildEvidencePack({
    ...PERIOD,
    children: [{ id: "c1", name: "Aroha" }],
    stories: [story("group", null, "2026-08-01", { outcomes: ["Belonging"] })],
  });
  assert.equal(pack.storyCount, 1);
  assert.equal(pack.coverage[0].stories, 0);
  assert.deepEqual(pack.curriculum, [{ link: "Belonging", stories: 1 }]);
});

test("what counts as thin scales with the period, so a year is not judged like a term", () => {
  assert.equal(thinCoverageFor("2026-07-20", "2026-09-25"), 2, "a term asks for two");
  assert.equal(thinCoverageFor("2026-06-24", "2026-09-22"), 3, "90 days asks for three");
  assert.equal(thinCoverageFor("2025-09-22", "2026-09-22"), 6, "a year asks for six, and no more");
  assert.equal(thinCoverageFor("2026-09-22", "2026-09-22"), 2, "a single day still asks for two, never zero");

  // The same two stories read as covered across a term and thin across a year.
  const children = [{ id: "c1", name: "Aroha" }];
  const stories = [story("s1", "c1", "2026-08-01"), story("s2", "c1", "2026-08-20")];
  const term = buildEvidencePack({ ...PERIOD, children, stories });
  assert.equal(term.coverage[0].status, "covered");
  const year = buildEvidencePack({ periodLabel: "Last 12 months", periodStart: "2025-09-22", periodEnd: "2026-09-22", children, stories });
  assert.equal(year.coverage[0].status, "thin");
  assert.ok(year.gaps.some((gap) => /fewer than 6 stories: Aroha/.test(gap)), JSON.stringify(year.gaps));
});
