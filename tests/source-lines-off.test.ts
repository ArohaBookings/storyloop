import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { leaderView, type CheckRow } from "../lib/story-check";
import { setView, type SetRow } from "../lib/leader-sets";

// A4's switch readers (25 Nov 2026). With LEADER_SOURCES_ON false: the leader
// page shows the story and note exactly as before, nothing new is stored, and
// the send panel has no tick and no numbers in the preview. With it on, only a
// row she ticked shows the numbers.
const read = (file: string) => readFileSync(file, "utf8");
const NOW = new Date("2026-11-25T10:00:00Z");
const story = { child_name: "Mia", observations: "Mia built a tower", story_text: "Tower\n\nLearning Story\nMia built a tower.", outcomes: [], next_steps: [], created_at: NOW.toISOString() };
const check = (over: Partial<CheckRow> = {}): CheckRow => ({ id: "c", story_id: "s", user_id: "u", status: "opened", leader_name: null, comment: null, created_at: NOW.toISOString(), opened_at: null, decided_at: null, expires_at: new Date(NOW.getTime() + 86_400_000).toISOString(), revoked_at: null, ...over });

test("the views: the numbers only for a row she ticked, an old row is a no", () => {
  assert.equal(leaderView({ story, check: check({ show_sources: true }), educatorName: "Sam", now: NOW }).showSources, true);
  assert.equal(leaderView({ story, check: check({ show_sources: false }), educatorName: "Sam", now: NOW }).showSources, false);
  assert.equal(leaderView({ story, check: check(), educatorName: "Sam", now: NOW }).showSources, false);
  const set = (over: Partial<SetRow>): SetRow => ({ id: "s", user_id: "u", status: "opened", centre_name: null, join_consent: false, created_at: NOW.toISOString(), opened_at: null, expires_at: NOW.toISOString(), revoked_at: null, ...over });
  assert.equal(setView({ set: set({ show_sources: true }), items: [], educatorName: "Sam", now: NOW }).showSources, true);
  assert.equal(setView({ set: set({}), items: [], educatorName: "Sam", now: NOW }).showSources, false);
});

test("LEADER_SOURCES_ON off: each reader falls back to the page as it was", () => {
  assert.match(read("lib/story-check.ts"), /showSources: LEADER_SOURCES_ON && check\.show_sources === true,/);
  assert.match(read("lib/leader-sets.ts"), /showSources: LEADER_SOURCES_ON && input\.set\.show_sources === true,/);
  assert.match(read("lib/leader-sets-server.ts"), /show_sources: LEADER_SOURCES_ON && input\.showSources === true,/);
  const route = read("app/api/stories/[id]/check/route.ts");
  assert.match(route, /const showSources = LEADER_SOURCES_ON && body\?\.showSources === true;/);
  assert.match(route, /\.\.\.\(showSources \? \{ show_sources: true \} : \{\}\),/, "off: the insert is the 24 Nov insert, column untouched");
  const lines = read("components/app/SourceLines.tsx");
  assert.match(lines, /LEADER_SOURCES_ON \? safeMatch\(/);
  assert.match(lines, /if \(!result\) return props\.kind === "story" \? <StoryText text=\{props\.text\} \/> : <>\{props\.text\}<\/>;/, "off or on error: StoryText, as before");
  const panel = read("components/app/SendToLeader.tsx");
  assert.match(panel, /if \(LEADER_SOURCES_ON && sources\) body\.showSources = true;/);
  assert.match(panel, /\{LEADER_SOURCES_ON && seenSources && <SourcesTick/);
  assert.match(panel, /preview=\{LEADER_SOURCES_ON \? \{ \.\.\.preview, showSources: true \} : preview\}/);
  const page = read("components/marketing/LeaderCheckPage.tsx");
  assert.match(page, /\{view\.showSources \? <SourceLines [^\n]* : <StoryText text=\{view\.story\} \/>\}/);
});
