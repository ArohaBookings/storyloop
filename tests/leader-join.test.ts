import test from "node:test";
import assert from "node:assert/strict";
import { mayJoinByTick, verifiedEmailOf } from "../lib/leader-join";
import { recipientHash } from "../lib/leader-email";
import { leaderTeamLine } from "../lib/story-check";

// MERGE2 2b: the tick adds her with no invitation only for the verified address her leader email went to.
const sent = [recipientHash("jo@kowhai.nz")];
const google = (email: string) => ({ email, identities: [{ provider: "google", identity_data: { email } }], app_metadata: { signup_method: "google" } });

test("a verified address is a Google identity on the same address, or a link signup; never a password signup", () => {
  assert.equal(verifiedEmailOf(google("Jo@Kowhai.NZ")), "jo@kowhai.nz");
  assert.equal(verifiedEmailOf({ email: "jo@kowhai.nz", identities: [{ provider: "email", identity_data: { email: "jo@kowhai.nz" } }], app_metadata: { signup_method: "email" } }), null);
  assert.equal(verifiedEmailOf({ email: "jo@kowhai.nz", identities: [{ provider: "google", identity_data: { email: "other@gmail.com" } }] }), null, "a Google identity on another address proves nothing");
  assert.equal(verifiedEmailOf({ email: "jo@kowhai.nz", app_metadata: { signup_method: "link" } }), "jo@kowhai.nz");
  assert.equal(verifiedEmailOf({ email: "jo@kowhai.nz", app_metadata: {} }), null);
  assert.equal(verifiedEmailOf(null), null);
  assert.equal(verifiedEmailOf({ email: "" , identities: [{ provider: "google", identity_data: { email: "" } }] }), null);
});

test("joining by the tick needs her tick, an email that went, and the same verified address", () => {
  assert.equal(mayJoinByTick({ consent: true, sentHashes: sent, verifiedEmail: "jo@kowhai.nz" }), true);
  assert.equal(mayJoinByTick({ consent: true, sentHashes: sent, verifiedEmail: verifiedEmailOf(google("JO@kowhai.nz")) }), true, "case does not matter");
  assert.equal(mayJoinByTick({ consent: false, sentHashes: sent, verifiedEmail: "jo@kowhai.nz" }), false, "no tick");
  assert.equal(mayJoinByTick({ consent: true, sentHashes: [], verifiedEmail: "jo@kowhai.nz" }), false, "a link she copied herself: no email went");
  assert.equal(mayJoinByTick({ consent: true, sentHashes: sent, verifiedEmail: "someone@else.nz" }), false, "another address");
  assert.equal(mayJoinByTick({ consent: true, sentHashes: sent, verifiedEmail: null }), false, "the right address on a password signup nobody proved");
});

test("the leader's page promises only what the rule does", () => {
  const emailed = leaderTeamLine("Sam", { joinConsent: true, sentByStoryLoop: true });
  assert.match(emailed, /Google sign-in on the address this was emailed to/);
  assert.match(emailed, /one tap/);
  assert.ok(!/already in your team/.test(emailed));
  for (const view of [{ joinConsent: true, sentByStoryLoop: false }, { joinConsent: false, sentByStoryLoop: true }, { joinConsent: false, sentByStoryLoop: false }]) {
    assert.equal(leaderTeamLine("Sam", view), "Sam is one tap away once you start.");
  }
  assert.ok(!/—/.test(emailed));
});
