import assert from "node:assert/strict";
import test from "node:test";
import { WORK_ROLES, cleanWorkRole, decidesForCentre, teamCardFor } from "../lib/work-role";

const base = { role: null, stories: 5, plan: "free", coveredByCentre: false, dismissed: false } as const;

test("only the four answers are accepted", () => {
  for (const role of WORK_ROLES) assert.equal(cleanWorkRole(role), role);
  for (const bad of ["admin", "Owner", "", null, undefined, 3, { role: "owner" }, "owner "]) assert.equal(cleanWorkRole(bad), null);
});

test("the question waits for the second story and is asked once", () => {
  assert.equal(teamCardFor({ ...base, stories: 0 }), null);
  assert.equal(teamCardFor({ ...base, stories: 1 }), null);
  assert.equal(teamCardFor({ ...base, stories: 2 }), "ask");
  assert.equal(teamCardFor({ ...base, role: "educator" }), null);
  assert.equal(teamCardFor({ ...base, role: "student" }), null);
});

test("a leader or owner sees the centre month until they close it", () => {
  assert.equal(decidesForCentre("leader"), true);
  assert.equal(decidesForCentre("owner"), true);
  assert.equal(decidesForCentre("educator"), false);
  assert.equal(decidesForCentre(null), false);
  assert.equal(teamCardFor({ ...base, role: "owner" }), "centre");
  assert.equal(teamCardFor({ ...base, role: "leader", stories: 0 }), "centre");
  assert.equal(teamCardFor({ ...base, role: "owner", dismissed: true }), null);
  // A paying educator who leads a team is exactly who should see it.
  assert.equal(teamCardFor({ ...base, role: "leader", plan: "educator" }), "centre");
});

test("nobody already on, or covered by, a centre plan is asked or offered anything", () => {
  for (const role of [null, "owner", "leader", "educator"] as const) {
    assert.equal(teamCardFor({ ...base, role, plan: "centre_starter" }), null);
    assert.equal(teamCardFor({ ...base, role, plan: "centre_growth" }), null);
    assert.equal(teamCardFor({ ...base, role, coveredByCentre: true }), null);
  }
});

test("a leader or owner is never shown 'Get your centre on board'", async () => {
  const { showsOnBoardCard } = await import("../lib/work-role");
  for (const role of ["leader", "owner"] as const) {
    assert.equal(showsOnBoardCard({ role, inCentre: false, centrePlan: false }), false, role);
  }
  for (const role of ["educator", "student", null] as const) {
    assert.equal(showsOnBoardCard({ role, inCentre: false, centrePlan: false }), true, String(role));
    assert.equal(showsOnBoardCard({ role, inCentre: true, centrePlan: false }), false);
    assert.equal(showsOnBoardCard({ role, inCentre: false, centrePlan: true }), false);
  }
  const { readFileSync } = await import("node:fs");
  assert.match(readFileSync("app/api/centres/route.ts", "utf8"), /showsOnBoardCard\(\{ role, inCentre: false, centrePlan: isCentrePlan\(profile\?\.plan\) \}\)/);
  assert.match(readFileSync("app/(app)/dashboard/page.tsx", "utf8"), /showsOnBoardCard\(\{ role: roleFacts\.role/);
});
