import assert from "node:assert/strict";
import test from "node:test";
import { buildCurriculumCompass } from "../lib/curriculum-compass";

test("maps EYLF outcome evidence without treating empty areas as scores", () => {
  const compass = buildCurriculumCompass("AU", [
    {
      id: "story-1",
      location: "AU",
      outcomes: ["EYLF Outcome 4"],
      metadata: { curriculumLinks: ["Confident and involved learners through problem solving"] },
    },
    {
      id: "story-2",
      location: "AU",
      outcomes: ["EYLF Outcome 5"],
      metadata: { curriculumLinks: ["Effective communicators"] },
    },
  ]);

  assert.equal(compass.find((item) => item.id === "eylf-4")?.count, 1);
  assert.equal(compass.find((item) => item.id === "eylf-5")?.count, 1);
  assert.equal(compass.find((item) => item.id === "eylf-1")?.count, 0);
});

test("maps Te Whāriki strand names and ignores stories from another framework", () => {
  const compass = buildCurriculumCompass("NZ", [
    {
      id: "story-nz",
      location: "NZ",
      outcomes: ["Mana aotūroa | Exploration"],
      metadata: { curriculumLinks: ["Children develop working theories"] },
    },
    {
      id: "story-au",
      location: "AU",
      outcomes: ["EYLF Outcome 4"],
      metadata: {},
    },
  ]);

  assert.deepEqual(
    compass.find((item) => item.id === "tw-exploration")?.evidenceStoryIds,
    ["story-nz"]
  );
});
