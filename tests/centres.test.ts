import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageBilling,
  canManageTeam,
  canReadActivity,
  canReadStoryContent,
  canAcceptInvite,
  seatsRemaining,
  type Membership,
} from "../lib/centres";

/**
 * The database has no row level security, so these functions ARE the boundary
 * protecting one centre's documentation about children from another's. They are
 * tested adversarially: every case below is written as an attempt to get at
 * something, and the expected answer is usually no.
 */

const member = (over: Partial<Membership> & { userId: string }): Membership => ({
  centreId: "centre-a",
  role: "educator",
  status: "active",
  sharesStories: false,
  ...over,
});

const ADMIN_A = member({ userId: "admin-a", role: "admin" });
const OWNER_A = member({ userId: "owner-a", role: "owner" });
const EDU_A = member({ userId: "edu-a" });
const EDU_A_SHARING = member({ userId: "edu-a2", sharesStories: true });
const ADMIN_B = member({ userId: "admin-b", role: "admin", centreId: "centre-b" });
const EDU_B_SHARING = member({ userId: "edu-b", centreId: "centre-b", sharesStories: true });

// ----------------------------------------------------------------- your own
test("everyone can always read their own work, centre or not", () => {
  assert.equal(canReadStoryContent("me", "me", null, null), true);
  assert.equal(canReadActivity("me", "me", null, null), true);
  assert.equal(canReadStoryContent("edu-a", "edu-a", EDU_A, EDU_A), true);
});

// ------------------------------------------------------------ no membership
test("a user in no centre reads nobody else, and nobody reads them", () => {
  assert.equal(canReadStoryContent("solo", "other", null, null), false);
  assert.equal(canReadStoryContent("admin-a", "solo", ADMIN_A, null), false);
  assert.equal(canReadStoryContent("solo", "edu-a2", null, EDU_A_SHARING), false);
});

// ------------------------------------------------------------- cross centre
test("a different centre is refused even when the author shares", () => {
  assert.equal(canReadStoryContent("admin-b", "edu-a2", ADMIN_B, EDU_A_SHARING), false);
  assert.equal(canReadStoryContent("admin-a", "edu-b", ADMIN_A, EDU_B_SHARING), false);
  assert.equal(canReadActivity("admin-b", "edu-a", ADMIN_B, EDU_A), false);
});

// ------------------------------------------------------------------ consent
test("an admin sees activity without consent but never content without it", () => {
  assert.equal(canReadActivity("admin-a", "edu-a", ADMIN_A, EDU_A), true);
  assert.equal(canReadStoryContent("admin-a", "edu-a", ADMIN_A, EDU_A), false);
});

test("an admin reads content only once the educator has opted in", () => {
  assert.equal(canReadStoryContent("admin-a", "edu-a2", ADMIN_A, EDU_A_SHARING), true);
  assert.equal(canReadStoryContent("owner-a", "edu-a2", OWNER_A, EDU_A_SHARING), true);
});

test("consent is strictly true: null or undefined is a refusal", () => {
  const sloppy = { ...EDU_A_SHARING, sharesStories: undefined as unknown as boolean };
  assert.equal(canReadStoryContent("admin-a", "edu-a2", ADMIN_A, sloppy), false);
  const nulled = { ...EDU_A_SHARING, sharesStories: null as unknown as boolean };
  assert.equal(canReadStoryContent("admin-a", "edu-a2", ADMIN_A, nulled), false);
});

test("an educator never reads a colleague, even one who shares with the centre", () => {
  // Sharing is with leadership for support and moderation, not the staff room.
  assert.equal(canReadStoryContent("edu-a", "edu-a2", EDU_A, EDU_A_SHARING), false);
  assert.equal(canReadActivity("edu-a", "edu-a2", EDU_A, EDU_A_SHARING), false);
});

// ------------------------------------------------------------ removed users
test("a removed member loses access immediately, in both directions", () => {
  const removedAdmin = { ...ADMIN_A, status: "removed" as const };
  assert.equal(canReadStoryContent("admin-a", "edu-a2", removedAdmin, EDU_A_SHARING), false);

  const removedAuthor = { ...EDU_A_SHARING, status: "removed" as const };
  assert.equal(canReadStoryContent("admin-a", "edu-a2", ADMIN_A, removedAuthor), false);
  assert.equal(canReadActivity("admin-a", "edu-a2", ADMIN_A, removedAuthor), false);
});

// ------------------------------------------------------------------- blanks
test("a blank or mismatched centre id never grants access", () => {
  const blank = { ...EDU_A_SHARING, centreId: "" };
  assert.equal(canReadStoryContent("admin-a", "edu-a2", { ...ADMIN_A, centreId: "" }, blank), false);
});

// -------------------------------------------------------------------- roles
test("only owners and admins manage the team; only owners touch billing", () => {
  assert.equal(canManageTeam(OWNER_A), true);
  assert.equal(canManageTeam(ADMIN_A), true);
  assert.equal(canManageTeam(EDU_A), false);
  assert.equal(canManageTeam(null), false);
  assert.equal(canManageTeam({ ...ADMIN_A, status: "removed" }), false);

  assert.equal(canManageBilling(OWNER_A), true);
  assert.equal(canManageBilling(ADMIN_A), false);
  assert.equal(canManageBilling(EDU_A), false);
  assert.equal(canManageBilling(null), false);
});

// -------------------------------------------------------------------- seats
test("seats never go negative and never exceed the limit", () => {
  assert.equal(seatsRemaining(10, 3), 7);
  assert.equal(seatsRemaining(10, 10), 0);
  assert.equal(seatsRemaining(10, 14), 0);
  assert.equal(seatsRemaining(0, 0), 0);
  assert.equal(seatsRemaining(Number.NaN, 2), 0);
  assert.equal(seatsRemaining(10, Number.NaN), 0);
});

// ------------------------------------------------------------------ invites
test("an invite is only acceptable when fresh, unused, and a seat is free", () => {
  const now = new Date("2026-09-17T00:00:00Z");
  const future = new Date("2026-09-24T00:00:00Z").toISOString();
  const past = new Date("2026-09-10T00:00:00Z").toISOString();
  const base = { seatLimit: 10, activeMembers: 3, acceptedAt: null, revokedAt: null, now };

  assert.deepEqual(canAcceptInvite({ ...base, expiresAt: future }), { ok: true });
  assert.deepEqual(canAcceptInvite({ ...base, expiresAt: past }), { ok: false, reason: "expired" });
  assert.deepEqual(canAcceptInvite({ ...base, expiresAt: null }), { ok: false, reason: "no_expiry" });
  assert.deepEqual(canAcceptInvite({ ...base, expiresAt: "not a date" }), { ok: false, reason: "bad_expiry" });
  assert.deepEqual(
    canAcceptInvite({ ...base, expiresAt: future, acceptedAt: now.toISOString() }),
    { ok: false, reason: "already_accepted" },
  );
  assert.deepEqual(
    canAcceptInvite({ ...base, expiresAt: future, revokedAt: now.toISOString() }),
    { ok: false, reason: "revoked" },
  );
  assert.deepEqual(
    canAcceptInvite({ ...base, expiresAt: future, activeMembers: 10 }),
    { ok: false, reason: "no_seats" },
  );
});

test("an invite expiring exactly now is expired, not valid", () => {
  const now = new Date("2026-09-17T00:00:00Z");
  assert.deepEqual(
    canAcceptInvite({
      seatLimit: 10, activeMembers: 1, acceptedAt: null, revokedAt: null,
      expiresAt: now.toISOString(), now,
    }),
    { ok: false, reason: "expired" },
  );
});
