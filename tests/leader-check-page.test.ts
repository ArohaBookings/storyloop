import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LeaderCheckPage, { leaderPageOrder } from "../components/marketing/LeaderCheckPage";
import { checkExpiry, leaderView, type CheckRow } from "../lib/story-check";
import { setView, type SetItemRow, type SetRow } from "../lib/leader-sets";

(globalThis as unknown as { React: typeof React }).React = React;

// A3 (25 Nov 2026): the leader's two minutes. Cover first, answer first, the
// offer only after the answer. With LEADER_EMAIL_ON false, the 24 Nov page.

const NOW = new Date("2026-11-25T02:00:00Z");
const story = { child_name: "Aria", observations: "Aria filled the jug.", story_text: "Aria filled the jug again and again.", outcomes: [], next_steps: [], created_at: "2026-11-24T01:00:00Z" };
const row = (over: Partial<CheckRow> = {}): CheckRow => ({
  id: "c1", story_id: "s1", user_id: "u1", status: "opened", leader_name: null, comment: null,
  created_at: "2026-11-24T01:00:00Z", opened_at: "2026-11-24T02:00:00Z", decided_at: null,
  expires_at: checkExpiry(new Date("2026-11-24T01:00:00Z")).toISOString(), revoked_at: null,
  centre_name: "Kowhai Kindergarten", share_counts: false, join_consent: true, ...over,
});
const offer = { code: "ABCDE", ref: "a".repeat(43), counts: null };
const render = (view: ReturnType<typeof leaderView> | ReturnType<typeof setView>) => renderToStaticMarkup(React.createElement(LeaderCheckPage, { preview: view }));

test("the switch decides the order: on, a cover and the offer after the answer; off, the 24 Nov page", () => {
  assert.deepEqual(leaderPageOrder(true), { cover: true, offerAfterAnswer: true });
  assert.deepEqual(leaderPageOrder(false), { cover: false, offerAfterAnswer: false });
});

test("the page asks for nothing but the cover until the tap", () => {
  const source = readFileSync("components/marketing/LeaderCheckPage.tsx", "utf8");
  const effect = source.slice(source.indexOf("if (ORDER.cover) {"), source.indexOf("const { ok, data } = await post({ token: key, action: \"open\" })"));
  assert.match(effect, /action: "cover"/);
  assert.match(effect, /return;\n\s+}\n\s+$/, "the cover branch returns before any open");
  assert.match(source, /const openIt = async \(\) => \{[\s\S]*?action: "open"/, "open only from the tap");
});

test("before the answer there is no start block; after it, the block with her centre's name and the team line", () => {
  const before = render(leaderView({ story, check: row(), educatorName: "Sam", now: NOW, offer }));
  assert.ok(before.includes("Looks good") && before.includes("Suggest a change"));
  assert.ok(!before.includes('data-testid="leader-check-centre"'), "no offer before the answer");
  assert.ok(!/\$|NZ\$|A\$/.test(before), "no price before the answer");
  const after = render(leaderView({ story, check: row({ status: "approved", decided_at: NOW.toISOString() }), educatorName: "Sam", now: NOW, offer }));
  assert.ok(after.includes('data-testid="leader-check-centre"'));
  assert.ok(after.includes("Start Kowhai Kindergarten free"));
  assert.ok(after.includes("Sam is already in your team the moment you start."));
  assert.ok(after.includes("No card needed."));
  const untick = render(leaderView({ story, check: row({ status: "approved", join_consent: false }), educatorName: "Sam", now: NOW, offer }));
  assert.ok(untick.includes("Sam is one tap away once you start.") && !untick.includes("already in your team"));
  const inCentre = render(leaderView({ story, check: row({ status: "approved" }), educatorName: "Sam", now: NOW, offer: null }));
  assert.ok(!inCentre.includes('data-testid="leader-check-centre"'), "no offer when she is already in a centre");
});

test("the preview is the leader's page with every button inert", () => {
  const html = render(leaderView({ story, check: row(), educatorName: "Sam", now: NOW, offer }));
  assert.match(html, /data-testid="leader-check-approve"[^>]*disabled|disabled=""[^>]*data-testid="leader-check-approve"/);
  assert.ok(html.includes("Aria filled the jug again and again."));
});

test("a set lists every piece with its kind, and All look good counts what is left", () => {
  const set: SetRow = { id: "s", user_id: "u", status: "opened", centre_name: null, join_consent: false, created_at: NOW.toISOString(), opened_at: NOW.toISOString(), expires_at: checkExpiry(NOW).toISOString(), revoked_at: null };
  const draft = { framework: "TW", mode: "transition", outcomes: [{ outcome: "Mana reo | Communication", seen: "Told a story.", strategy: "Ask her.", gap: "" }], checks: [] };
  const items: SetItemRow[] = Array.from({ length: 12 }, (_, i) => ({ position: i + 1, mode: i === 2 ? "summary" : "transition", framework: "TW", child_first_name: `Kid${i + 1}`, note: "n", draft: { ...draft, mode: i === 2 ? "summary" : "transition" }, decision: i === 0 ? "approved" : null, comment: null, decided_at: null }));
  const html = render(setView({ set, items, educatorName: "Sam", now: NOW, offer: null }));
  assert.equal((html.match(/data-testid="leader-set-row"/g) ?? []).length, 12);
  assert.ok(html.includes("12 statements from Sam"));
  assert.ok(html.includes("All look good (<!-- -->11<!-- --> left)") || html.includes("All look good (11 left)"));
  assert.ok(html.includes("Summary") && html.includes("Transition statement"));
});
