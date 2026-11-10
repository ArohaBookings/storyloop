import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  CHECK_COMMENT_MAX,
  CHECK_DAYS,
  canAnswer,
  canReadThroughLink,
  checkExpiry,
  checkState,
  checkUrl,
  cleanCheckComment,
  cleanDecision,
  cleanLeaderName,
  educatorFirstName,
  educatorView,
  leaderView,
  looksLikeCheckToken,
  tokenFromHash,
  type CheckRow,
} from "../lib/story-check";
import { hashCheckToken, newCheckToken } from "../lib/story-check-token";

const NOW = new Date("2026-11-10T02:00:00Z");
const row = (over: Partial<CheckRow> = {}): CheckRow => ({
  id: "c1", story_id: "s1", user_id: "u1", status: "sent", leader_name: null, comment: null,
  created_at: "2026-11-10T01:00:00Z", opened_at: null, decided_at: null,
  expires_at: checkExpiry(new Date("2026-11-10T01:00:00Z")).toISOString(), revoked_at: null, ...over,
});

test("a link key is 32 URL-safe characters, different every time, and only its hash is kept", () => {
  const a = newCheckToken(); const b = newCheckToken();
  assert.ok(looksLikeCheckToken(a.token));
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashCheckToken(a.token));
  assert.equal(a.hash.length, 64);
  assert.ok(!a.hash.includes(a.token));
});

test("anything that is not a key is never looked up", () => {
  for (const bad of ["", "short", "a".repeat(31), "a".repeat(33), "a".repeat(31) + "/", "../../etc/passwd", null, 42, {}]) {
    assert.equal(looksLikeCheckToken(bad), false);
  }
});

test("the link keeps its key after the #, where no server sees it", () => {
  const { token } = newCheckToken();
  const url = checkUrl("https://storyloop.space/", token);
  assert.equal(url, `https://storyloop.space/check#${token}`);
  assert.equal(new URL(url).pathname, "/check");
  assert.equal(new URL(url).search, "");
  assert.equal(tokenFromHash(new URL(url).hash), token);
  assert.equal(tokenFromHash("#not-a-key"), "");
  assert.equal(tokenFromHash(""), "");
});

test(`a link lasts ${CHECK_DAYS} days and then opens nothing`, () => {
  const fresh = row();
  assert.equal(checkState(fresh, NOW), "open");
  assert.equal(canReadThroughLink(fresh, NOW), true);
  const later = new Date(NOW.getTime() + (CHECK_DAYS + 1) * 86400000);
  assert.equal(checkState(fresh, later), "expired");
  assert.equal(canReadThroughLink(fresh, later), false);
  assert.equal(canAnswer(fresh, later), false);
});

test("a cancelled link opens nothing, even if it was answered", () => {
  for (const status of ["sent", "opened", "approved", "changes"] as const) {
    const cancelled = row({ status, revoked_at: NOW.toISOString() });
    assert.equal(checkState(cancelled, NOW), "cancelled");
    assert.equal(canReadThroughLink(cancelled, NOW), false);
    assert.equal(canAnswer(cancelled, NOW), false);
  }
});

test("a check is answered once: an answered check cannot be answered again", () => {
  assert.equal(canAnswer(row({ status: "opened" }), NOW), true);
  for (const status of ["approved", "changes"] as const) {
    const done = row({ status, decided_at: NOW.toISOString() });
    assert.equal(checkState(done, NOW), "answered");
    assert.equal(canAnswer(done, NOW), false);
    // The leader can still read what they said, but only until the link's own expiry.
    assert.equal(canReadThroughLink(done, NOW), true);
    assert.equal(canReadThroughLink(done, new Date(NOW.getTime() + (CHECK_DAYS + 1) * 86400000)), false);
  }
});

test("the leader's name is a name: no addresses, digits or markup", () => {
  assert.equal(cleanLeaderName("  Sarah  "), "Sarah");
  assert.equal(cleanLeaderName("Mere-Ana O'Neil"), "Mere-Ana O'Neil");
  assert.equal(cleanLeaderName("Hēmi"), "Hēmi");
  assert.equal(cleanLeaderName("sarah@centre.co.nz"), "");
  assert.equal(cleanLeaderName("<script>alert(1)</script>"), "scriptalertscript");
  assert.equal(cleanLeaderName("x".repeat(200)).length, 40);
  assert.equal(cleanLeaderName(null), "");
});

test("the leader's comment is plain text with contact details blanked and a cap", () => {
  assert.equal(cleanCheckComment("  Nice.\n\n\n\nOne thing.  "), "Nice.\n\nOne thing.");
  assert.equal(cleanCheckComment("email me at boss@centre.co.nz or 021 555 1234"), "email me at [email] or [number]");
  assert.equal(cleanCheckComment("y".repeat(5000)).length, CHECK_COMMENT_MAX);
  assert.equal(cleanCheckComment(undefined), "");
});

test("only the two answers exist", () => {
  assert.equal(cleanDecision("approved"), "approved");
  assert.equal(cleanDecision("changes"), "changes");
  for (const bad of ["sent", "opened", "APPROVED", "", null, 1]) assert.equal(cleanDecision(bad), null);
});

test("the educator is shown by first name only, never by address", () => {
  assert.equal(educatorFirstName("Sam Taylor"), "Sam");
  assert.equal(educatorFirstName("  Mere  Ngata "), "Mere");
  assert.equal(educatorFirstName("sam.taylor@gmail.com"), "An educator");
  assert.equal(educatorFirstName(""), "An educator");
  assert.equal(educatorFirstName(null), "An educator");
});

test("the leader's page receives the story and the note, and nothing that identifies the account", () => {
  const view = leaderView({
    story: { child_name: "Ruby Smith", observations: "Ruby poured. \"more water\"", story_text: "Ruby poured the water.", outcomes: ["4.1"], next_steps: ["Offer jugs"], created_at: "2026-11-09T00:00:00Z" },
    check: row({ status: "opened" }),
    educatorName: "Sam Taylor",
    now: NOW,
  });
  assert.equal(view.educator, "Sam");
  assert.equal(view.childName, "Ruby");
  assert.equal(view.note, "Ruby poured. \"more water\"");
  assert.equal(view.state, "open");
  const flat = JSON.stringify(view);
  for (const secret of ["u1", "s1", "c1", "Taylor", "Smith", "token", "hash", "email"]) assert.ok(!flat.includes(secret), `leaks ${secret}`);
});

test("the educator sees where the check stands and what the leader said", () => {
  assert.deepEqual(educatorView(null), { state: "none" });
  const waiting = educatorView(row(), NOW);
  assert.equal(waiting.state, "open");
  const opened = educatorView(row({ status: "opened", opened_at: NOW.toISOString() }), NOW);
  assert.ok(opened.state !== "none" && opened.opened);
  const said = educatorView(row({ status: "changes", leader_name: "Sarah", comment: "Check the second paragraph.", decided_at: NOW.toISOString() }), NOW);
  assert.ok(said.state === "answered" && said.decision === "changes" && said.leaderName === "Sarah" && said.comment === "Check the second paragraph.");
});

test("the check table is service-role only, and the link key never reaches analytics or a URL path", () => {
  const sql = readFileSync("supabase/migrations/20261110_story_checks.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.story_checks from anon, authenticated/);
  assert.doesNotMatch(sql, /create policy/i);
  assert.match(sql, /token_hash text not null unique/);
  assert.doesNotMatch(sql, /\btoken text\b/);
  const page = readFileSync("components/marketing/LeaderCheckPage.tsx", "utf8");
  // Every event from the leader's page is filed under "/check", never the address bar.
  for (const call of page.match(/track\("leader_check_[a-z_]+",[^\n]+/g) ?? []) assert.match(call, /, AT\)/);
  assert.match(page, /const AT = \{ path: "\/check" \}/);
  const route = readFileSync("app/api/check/route.ts", "utf8");
  assert.match(route, /body\.token/);
  assert.doesNotMatch(route, /searchParams|params\.token/);
  const meta = readFileSync("app/check/page.tsx", "utf8");
  assert.match(meta, /robots: \{ index: false, follow: false \}/);
});
