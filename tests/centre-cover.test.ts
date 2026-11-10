import assert from "node:assert/strict";
import test from "node:test";
import { centreCover, liveCentrePlan, liveSeatLimit, type Membership } from "../lib/centres";

const member = (over: Partial<Membership> = {}): Membership => ({ centreId: "c1", userId: "edu", role: "educator", status: "active", sharesStories: false, ...over });
const owner = (plan: string | null, subscription_status: string | null) => ({ plan, subscription_status });
const cover = (over: Partial<Parameters<typeof centreCover>[0]> = {}) =>
  centreCover({ userId: "edu", ownPlan: "free", membership: member(), centreOwnerId: "boss", owner: owner("centre_starter", "trialing"), ...over });

test("a free educator in a centre on its free month is covered by the centre plan", () => {
  assert.equal(cover(), "centre_starter");
  assert.equal(cover({ owner: owner("centre_growth", "active") }), "centre_growth");
  // Past due is the grace period: the team keeps working while the card is retried.
  assert.equal(cover({ owner: owner("centre_starter", "past_due") }), "centre_starter");
  // Missing own plan reads as free.
  assert.equal(cover({ ownPlan: null }), "centre_starter");
  assert.equal(cover({ ownPlan: undefined }), "centre_starter");
});

test("cover ends the moment the owner's plan is not live", () => {
  for (const status of ["canceled", "cancelled", "unpaid", "incomplete", "incomplete_expired", "paused", "payment_required", "free", "", null]) {
    assert.equal(cover({ owner: owner("centre_starter", status) }), null, `status ${status}`);
  }
  // The free month ran out with no card: the owner is back on the free plan.
  assert.equal(cover({ owner: owner("free", "free") }), null);
  assert.equal(cover({ owner: null }), null);
  assert.equal(cover({ owner: undefined }), null);
});

test("only a centre plan covers a team: an owner on an individual plan covers nobody", () => {
  for (const plan of ["educator", "educator_pro", "free", "enterprise", "CENTRE_STARTER", "", null]) {
    assert.equal(cover({ owner: owner(plan, "active") }), null, `owner plan ${plan}`);
  }
});

test("nobody is covered without an active membership of their own", () => {
  assert.equal(cover({ membership: null }), null);
  assert.equal(cover({ membership: member({ status: "removed" }) }), null);
  // A membership row that belongs to somebody else is not this educator's cover.
  assert.equal(cover({ membership: member({ userId: "someone-else" }) }), null);
  assert.equal(cover({ userId: "" }), null);
  assert.equal(cover({ centreOwnerId: null }), null);
  assert.equal(cover({ centreOwnerId: undefined }), null);
});

test("the owner is never covered: the plan is their own", () => {
  assert.equal(cover({ userId: "boss", membership: member({ userId: "boss", role: "owner" }), centreOwnerId: "boss" }), null);
});

test("an educator who pays for their own plan keeps it untouched", () => {
  assert.equal(cover({ ownPlan: "educator" }), null);
  assert.equal(cover({ ownPlan: "educator_pro" }), null);
  assert.equal(cover({ ownPlan: "centre_starter" }), null);
});

test("admins of the centre are covered like any other member", () => {
  assert.equal(cover({ membership: member({ role: "admin" }) }), "centre_starter");
});

test("seats follow the owner's plan as it is today", () => {
  assert.equal(liveSeatLimit(owner("centre_starter", "trialing")), 10);
  assert.equal(liveSeatLimit(owner("centre_growth", "active")), 25);
  assert.equal(liveSeatLimit(owner("centre_growth", "past_due")), 25);
  // No live centre plan: a centre of one, which is where the plan is offered.
  assert.equal(liveSeatLimit(owner("free", "free")), 1);
  assert.equal(liveSeatLimit(owner("educator", "active")), 1);
  assert.equal(liveSeatLimit(owner("centre_starter", "canceled")), 1);
  assert.equal(liveSeatLimit(null), 1);
  assert.equal(liveCentrePlan(owner("centre_starter", "admin_override")), "centre_starter");
  assert.equal(liveCentrePlan(owner("centre_starter", "unpaid")), null);
});
