import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MAX_TRANSITION_NOTES } from "../lib/ai/transition-draft";
import { SET_NOTE_MAX, allAnswered, canAnswerSet, canReadSet, cleanPieces, setExpiry, setPurgeDue, setView, type SetItemRow, type SetRow } from "../lib/leader-sets";

const NOW = new Date("2026-11-25T02:00:00Z");
const draft = (seen = "Told a long story at mat time.") => ({ framework: "TW", mode: "transition", outcomes: [{ outcome: "Mana reo | Communication", seen, strategy: "Ask about the story.", gap: "" }], checks: [] });
const raw = (name: string, over: Record<string, unknown> = {}) => ({ childFirstName: name, mode: "transition", framework: "TW", note: `${name} told a story.`, draft: draft(), ...over });

test("the note limit is the drafter's own", () => assert.equal(SET_NOTE_MAX, MAX_TRANSITION_NOTES));

test("cleanPieces keeps first names only, drops empty and over-long, and refuses a draft with nothing seen", () => {
  const out = cleanPieces([raw("Aria Smith"), raw(""), raw("Big", { note: "x".repeat(SET_NOTE_MAX + 1) }), raw("Nope", { draft: draft("") }), raw("Nikau")]);
  assert.ok(out);
  assert.deepEqual(out.map((p) => [p.position, p.childFirstName]), [[1, "Aria"], [2, "Nikau"]]);
  assert.equal(cleanPieces([]), null);
  assert.equal(cleanPieces(Array.from({ length: 31 }, (_, i) => raw(`K${i}`))), null);
  assert.equal(cleanPieces([raw("Mia", { mode: "summary" })]), null, "the piece's kind must match its draft");
});

test("setView never carries an account id, an email or the key, and sorts by position", () => {
  const set: SetRow = { id: "set-1", user_id: "user-secret-id", status: "opened", centre_name: "Kowhai", join_consent: true, created_at: NOW.toISOString(), opened_at: null, expires_at: setExpiry(NOW).toISOString(), revoked_at: null };
  const items: SetItemRow[] = [2, 1].map((position) => ({ position, mode: "transition", framework: "TW", child_first_name: position === 1 ? "Aria" : "Nikau", note: "n", draft: draft(), decision: null, comment: null, decided_at: null }));
  const view = setView({ set, items, educatorName: "sam@example.test", now: NOW, offer: { code: "ABCDE", ref: "r".repeat(43), counts: null } });
  const json = JSON.stringify(view);
  assert.ok(!json.includes("user-secret-id") && !json.includes("set-1") && !json.includes("@"));
  assert.deepEqual(view.items.map((i) => i.childName), ["Aria", "Nikau"]);
  assert.equal(view.educator, "An educator");
  assert.equal(view.joinConsent, true);
});

test("a set reads while open, answered sets read until expiry, purged sets never; answers only while open", () => {
  const base = { status: "opened" as const, expires_at: setExpiry(NOW).toISOString(), revoked_at: null, purged_at: null };
  assert.equal(canReadSet(base, NOW), true);
  assert.equal(canAnswerSet(base, NOW), true);
  assert.equal(canAnswerSet({ ...base, status: "answered" }, NOW), false);
  assert.equal(canReadSet({ ...base, status: "answered" }, NOW), true);
  assert.equal(canReadSet({ ...base, revoked_at: NOW.toISOString() }, NOW), false);
  assert.equal(canReadSet({ ...base, purged_at: NOW.toISOString() }, NOW), false);
  assert.equal(allAnswered([{ decision: "approved" }, { decision: "changes" }]), true);
  assert.equal(allAnswered([{ decision: "approved" }, { decision: null }]), false);
});

test("content is wiped 7 days after the link ends, once", () => {
  const expires = setExpiry(NOW);
  assert.equal(setPurgeDue({ expires_at: expires.toISOString(), purged_at: null }, new Date(expires.getTime() + 6 * 86_400_000)), false);
  assert.equal(setPurgeDue({ expires_at: expires.toISOString(), purged_at: null }, new Date(expires.getTime() + 7 * 86_400_000)), true);
  assert.equal(setPurgeDue({ expires_at: expires.toISOString(), purged_at: NOW.toISOString() }, new Date(expires.getTime() + 9 * 86_400_000)), false);
});

test("answer all touches only pieces with no decision, and purge keeps decisions", () => {
  const server = readFileSync("lib/leader-sets-server.ts", "utf8");
  const all = server.slice(server.indexOf("export async function answerSetAll"), server.indexOf("export async function createLeaderSet"));
  assert.match(all, /\.update\(\{ decision: "approved"[\s\S]*?\.is\("decision", null\)/);
  const purge = server.slice(server.indexOf("export async function purgeExpiredSets"));
  assert.match(purge, /update\(\{ child_first_name: null, note: null, draft: null, comment: null \}\)/);
  assert.ok(!/decision: null/.test(purge), "decisions are kept");
});
