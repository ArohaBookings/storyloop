import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { checkExpiry, coverView, leaderView, type CheckRow } from "../lib/story-check";

// A6 (25 Nov 2026): links made before the leader-path build keep working.
// A row read before the migration has neither join_consent nor show_sources.

const NOW = new Date("2026-11-25T02:00:00Z");
const story = {
  child_name: "Aria Tester",
  observations: "Aria filled the jug.",
  story_text: "Aria filled the jug again and again.",
  outcomes: ["Mana aotūroa | Exploration"],
  next_steps: ["Offer jugs of different sizes"],
  created_at: "2026-11-23T01:00:00Z",
};

/** Exactly the columns the 13 Nov code selected: no join_consent, no show_sources. */
const oldRow = (over: Partial<CheckRow> = {}): CheckRow => ({
  id: "c1", story_id: "s1", user_id: "u1", status: "sent", leader_name: null, comment: null,
  created_at: "2026-11-23T01:00:00Z", opened_at: null, decided_at: null,
  expires_at: checkExpiry(new Date("2026-11-23T01:00:00Z")).toISOString(), revoked_at: null,
  centre_name: "Kowhai Kindergarten", share_counts: true, ...over,
});

test("a row in the pre-migration shape still produces a full view", () => {
  const view = leaderView({ story, check: oldRow(), educatorName: "Sam Tester", now: NOW, offer: { code: "ABCDE", ref: null, counts: { stories30: 4, children30: 3 } } });
  assert.equal(view.kind, "story");
  assert.equal(view.state, "open");
  assert.equal(view.educator, "Sam");
  assert.equal(view.childName, "Aria");
  assert.equal(view.story, story.story_text);
  assert.equal(view.centreName, "Kowhai Kindergarten");
  assert.equal(view.joinConsent, false, "no tick on an old row means no 'already in your team'");
  assert.deepEqual(view.offer?.counts, { stories30: 4, children30: 3 });
  assert.equal(view.expiresAt, "2026-12-07T01:00:00.000Z", "made 23 Nov, open until 7 Dec");
});

test("the join tick is read only when it is strictly true", () => {
  assert.equal(leaderView({ story, check: oldRow({ join_consent: true }), educatorName: "Sam", now: NOW }).joinConsent, true);
  assert.equal(leaderView({ story, check: oldRow({ join_consent: null }), educatorName: "Sam", now: NOW }).joinConsent, false);
});

test("the cover carries who sent it and nothing of the story", () => {
  const cover = coverView({ kind: "story", check: oldRow(), educatorName: "Sam Tester", pieces: 1, now: NOW });
  assert.deepEqual(Object.keys(cover).sort(), ["centreName", "educator", "expiresAt", "kind", "pieces", "state"]);
  assert.equal(cover.educator, "Sam");
  assert.ok(!JSON.stringify(cover).includes("Aria"), "no child's name on the cover");
});

test("the server finds story checks first, and only a miss looks in leader sets", () => {
  const source = readFileSync("lib/story-check-server.ts", "utf8");
  const find = source.slice(source.indexOf("async function findAny"), source.indexOf("async function findAny") + 900);
  assert.ok(find.indexOf("findCheck(") >= 0 && find.indexOf("findCheck(") < find.indexOf("findSet("), "story_checks first");
});
