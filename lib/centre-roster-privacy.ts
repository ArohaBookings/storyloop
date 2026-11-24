import { educatorFirstName } from "@/lib/story-check";

/**
 * Who on a centre's roster the leader first met through a leader check or a
 * statement set: shown as the leader met them, a first name and never an
 * address. Two ways in: the one-tap invitation (centre_invites.from_leader_offer,
 * accepted) and, since 25 Nov 2026, the tick beside Send that adds her when the
 * leader starts the centre (lib/leader-offer-server.ts joinFromLeaderOffer:
 * a story_checks or leader_sets row she ticked, claimed by someone in this centre).
 */
export function offerJoinedIds(input: {
  memberIds: string[];
  acceptedOfferInvites: { accepted_by: string | null }[];
  tickedOffers: { user_id: string | null; offer_claimed_by: string | null; join_consent: boolean | null }[];
}): Set<string> {
  const members = new Set(input.memberIds);
  const ids = new Set<string>();
  for (const row of input.acceptedOfferInvites) if (row.accepted_by) ids.add(row.accepted_by);
  for (const row of input.tickedOffers) {
    if (row.join_consent === true && row.user_id && row.offer_claimed_by && members.has(row.offer_claimed_by) && row.user_id !== row.offer_claimed_by) ids.add(row.user_id);
  }
  return ids;
}

export function maskOfferMembers<T extends { user_id: string; full_name: string | null; email: string | null }>(members: T[], viaOffer: Set<string>): T[] {
  return members.map((member) => (viaOffer.has(member.user_id) ? { ...member, full_name: educatorFirstName(member.full_name), email: null } : member));
}
