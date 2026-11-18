import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { LEADER_CARD_DISMISSED_EVENT, LEADER_CARD_MIN_STORIES, readLeaderCardRequest, showsLeaderCard, type LeaderCardFacts } from "../lib/leader-card";

/**
 * "Send this to my leader" (19 Nov 2026): who sees the quiet card after a copy.
 * Written as people: the card is for an educator in no centre who has written
 * at least two stories, and for nobody else, and never again after No thanks
 * or after she has sent a story to a leader.
 */

const writer: LeaderCardFacts = { storyIsHers: true, stories: 2, inCentre: false, centrePlan: false, role: "educator", dismissed: false, sentBefore: false };

test("an educator in no centre sees it from her second story", () => {
  assert.equal(LEADER_CARD_MIN_STORIES, 2);
  assert.equal(showsLeaderCard(writer), true);
  assert.equal(showsLeaderCard({ ...writer, stories: 14 }), true);
  assert.equal(showsLeaderCard({ ...writer, role: null }), true, "she has not answered the role question");
  assert.equal(showsLeaderCard({ ...writer, role: "student" }), true);
});

test("never on her first story", () => {
  assert.equal(showsLeaderCard({ ...writer, stories: 1 }), false);
  assert.equal(showsLeaderCard({ ...writer, stories: 0 }), false);
});

test("never for someone else's story", () => {
  assert.equal(showsLeaderCard({ ...writer, storyIsHers: false }), false);
});

test("never for a leader or owner, or anyone already in a centre or on a centre plan", () => {
  assert.equal(showsLeaderCard({ ...writer, role: "leader" }), false);
  assert.equal(showsLeaderCard({ ...writer, role: "owner" }), false);
  assert.equal(showsLeaderCard({ ...writer, inCentre: true }), false);
  assert.equal(showsLeaderCard({ ...writer, centrePlan: true }), false);
});

test("gone for good after No thanks, or once she has sent any story to a leader", () => {
  assert.equal(showsLeaderCard({ ...writer, dismissed: true }), false);
  assert.equal(showsLeaderCard({ ...writer, sentBefore: true }), false);
});

test("the browser may only ask about one story by id, or say No thanks", () => {
  assert.deepEqual(readLeaderCardRequest({ action: "check", storyId: "0F6C9A52-1B2C-4D3E-8F90-1234567890AB" }), { action: "check", storyId: "0f6c9a52-1b2c-4d3e-8f90-1234567890ab" });
  assert.deepEqual(readLeaderCardRequest({ action: "dismiss" }), { action: "dismiss" });
  assert.equal(readLeaderCardRequest({ action: "check", storyId: "sample-story-1" }), null);
  assert.equal(readLeaderCardRequest({ action: "check" }), null);
  assert.equal(readLeaderCardRequest({ action: "send", storyId: "0f6c9a52-1b2c-4d3e-8f90-1234567890ab" }), null);
  assert.equal(readLeaderCardRequest(null), null);
  assert.equal(readLeaderCardRequest("dismiss"), null);
});

test("the server answers from her own account and keeps No thanks with her id only", () => {
  const route = readFileSync(new URL("../app/api/leader-card/route.ts", import.meta.url), "utf8");
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /event_type: LEADER_CARD_DISMISSED_EVENT/);
  assert.match(route, /metadata: \{\}/, "No thanks stores nothing but that it was said");
  assert.match(route, /consumeRateLimit\(\{ scope: "leader-card"/);
  assert.equal(LEADER_CARD_DISMISSED_EVENT, "leader_card_dismissed");
  const card = readFileSync(new URL("../components/app/LeaderCard.tsx", import.meta.url), "utf8");
  // A quiet card in the page: no dialog, no overlay, no fixed position.
  assert.equal(/role="dialog"|aria-modal|fixed inset|position: ?"fixed"/.test(card), false);
  // Events carry the story's id and a fixed action name only.
  for (const call of card.match(/trackEvent\([^)]*\)/g) ?? []) assert.match(call, /^trackEvent\("ui_action", \{ action: "leader_card_\w+", story_id: storyId \}\)$/);
  // It never talks about pausing or cancelling (Billing only).
  assert.equal(/pause|cancel/i.test(card.replace(/\/\*[\s\S]*?\*\//g, "")), false);
});
