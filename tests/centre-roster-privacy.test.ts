import assert from "node:assert/strict";
import test from "node:test";
import { maskOfferMembers, offerJoinedIds } from "../lib/centre-roster-privacy";

test("a member who joined by the tick beside Send is shown by first name, with no address", () => {
  const ids = offerJoinedIds({
    memberIds: ["jo", "sam", "kim"],
    acceptedOfferInvites: [],
    tickedOffers: [{ user_id: "sam", offer_claimed_by: "jo", join_consent: true }],
  });
  const members = maskOfferMembers([
    { user_id: "jo", full_name: "Jo Owner", email: "jo@x.nz" },
    { user_id: "sam", full_name: "Sam Taylor", email: "sam@x.nz" },
    { user_id: "kim", full_name: "Kim Lee", email: "kim@x.nz" },
  ], ids);
  assert.deepEqual(members[1], { user_id: "sam", full_name: "Sam", email: null });
  assert.equal(members[0].email, "jo@x.nz");
  assert.equal(members[2].email, "kim@x.nz");
});

test("the one-tap invitation still counts; an unticked offer, or one claimed outside the centre, does not", () => {
  const ids = offerJoinedIds({
    memberIds: ["jo", "sam", "kim", "ana"],
    acceptedOfferInvites: [{ accepted_by: "kim" }, { accepted_by: null }],
    tickedOffers: [
      { user_id: "sam", offer_claimed_by: "jo", join_consent: false },
      { user_id: "ana", offer_claimed_by: "stranger", join_consent: true },
      { user_id: "jo", offer_claimed_by: "jo", join_consent: true },
    ],
  });
  assert.deepEqual([...ids].sort(), ["kim"]);
});
