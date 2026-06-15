import assert from "node:assert/strict";
import test from "node:test";
import { buildStoryInsights } from "../lib/story-insights";

test("aggregates learning threads, reflections, and revisited follow-ups", () => {
  const insights = buildStoryInsights([
    {
      id: "1",
      child_id: "child-1",
      child_name: "Ari",
      outcomes: ["EYLF Outcome 4"],
      next_steps: ["Offer loose parts"],
      metadata: {
        learningDispositions: ["curiosity", "perseverance"],
        educatorReflection: "Ari returned to the idea.",
        followUpStatus: "revisited",
      },
      created_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "2",
      child_id: "child-1",
      child_name: "Ari",
      outcomes: ["EYLF Outcome 4"],
      next_steps: ["Invite prediction"],
      metadata: {
        learningDispositions: ["curiosity"],
        followUpStatus: "open",
      },
      created_at: "2026-06-02T00:00:00.000Z",
    },
  ]);

  assert.equal(insights.totalStories, 2);
  assert.equal(insights.children[0].storyCount, 2);
  assert.equal(insights.children[0].openNextSteps, 2);
  assert.equal(insights.dispositions[0].label, "curiosity");
  assert.equal(insights.dispositions[0].count, 2);
  assert.equal(insights.reflectedStories, 1);
  assert.equal(insights.revisitedStories, 1);
  assert.equal(insights.openFollowUps, 1);
});
