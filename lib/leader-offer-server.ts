import { createAdminSupabase } from "@/lib/supabase/admin";
import { canManageTeam, countActiveMembers, getCentre, getMembership, seatsRemaining } from "@/lib/centres";
import { createCentreInvite } from "@/lib/centre-invites";
import { canUseOffer, cleanCentreName, educatorFirstName, looksLikeOfferRef } from "@/lib/story-check";
import { hashOfferRef } from "@/lib/story-check-token";

/**
 * The centre that starts from a story an educator sent (13 Nov 2026).
 *
 * The leader's page (components/marketing/LeaderCheckPage.tsx) sends "Start
 * our free month" to signup with the check's OFFER REFERENCE after the #. That
 * reference is a one-way hash of the link key (lib/story-check-token.ts), so it
 * is not the key, cannot become one, and reads nothing: no story, no note.
 *
 * What it can do, and only for a signed-in account:
 *   CLAIM it, once. The first account to claim a check's offer holds it; any
 *     other account is told nothing. The educator herself cannot claim her own.
 *   READ two things the leader was already shown: the educator's FIRST name and
 *     the centre name she typed. Never her email, surname, account or stories.
 *   INVITE her, with one tap, once the claimer runs a centre: the same
 *     invitation the email form makes (lib/centre-invites.ts), addressed to her
 *     account. Seat limits and the consent rules in lib/centres.ts apply
 *     unchanged, and she joins only by accepting it herself.
 *
 * Cancelling the link (the educator's own control) ends all of it at once.
 */

export type LeaderOfferStatus = "ready" | "invited" | "joined" | "unavailable";

export type LeaderOfferSummary = {
  educator: string;
  centreName: string;
  status: LeaderOfferStatus;
};

type OfferRow = {
  id: string;
  user_id: string;
  centre_name: string | null;
  expires_at: string;
  revoked_at: string | null;
  offer_claimed_by: string | null;
  offer_invited_at: string | null;
};

const OFFER_COLUMNS = "id, user_id, centre_name, expires_at, revoked_at, offer_claimed_by, offer_invited_at";

async function educatorAccount(userId: string): Promise<{ firstName: string; email: string | null }> {
  const admin = createAdminSupabase();
  const [{ data: profile }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  return { firstName: educatorFirstName(profile?.full_name ?? null), email: auth?.user?.email?.trim().toLowerCase() ?? null };
}

/** Where things stand between the claimer's centre and the educator. Never says anything about her account. */
async function statusFor(claimerId: string, row: OfferRow, email: string | null): Promise<LeaderOfferStatus> {
  const membership = await getMembership(claimerId);
  if (!membership) return "ready";
  const theirs = await getMembership(row.user_id);
  if (theirs?.centreId === membership.centreId) return "joined";
  if (!email) return "unavailable";
  const { data: pending } = await createAdminSupabase()
    .from("centre_invites")
    .select("id")
    .eq("centre_id", membership.centreId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  return pending?.length ? "invited" : "ready";
}

async function summarise(claimerId: string, row: OfferRow): Promise<LeaderOfferSummary> {
  const account = await educatorAccount(row.user_id);
  return {
    educator: account.firstName,
    centreName: cleanCentreName(row.centre_name ?? ""),
    status: await statusFor(claimerId, row, account.email),
  };
}

/**
 * Claim an offer reference for this account. Null for anything that is not a
 * live, unclaimed (or already this account's) offer: an unknown reference, a
 * cancelled link, the educator's own account, or another account's claim all
 * look exactly the same.
 */
export async function claimLeaderOffer(userId: string, ref: unknown, now = new Date()): Promise<LeaderOfferSummary | null> {
  if (!userId || !looksLikeOfferRef(ref)) return null;
  try {
    const admin = createAdminSupabase();
    const { data } = await admin.from("story_checks").select(OFFER_COLUMNS).eq("offer_ref_hash", hashOfferRef(ref)).maybeSingle();
    const row = data as OfferRow | null;
    if (!row || !canUseOffer(row, now) || row.user_id === userId) return null;
    if (row.offer_claimed_by && row.offer_claimed_by !== userId) return null;
    if (!row.offer_claimed_by) {
      // Conditional, so two accounts claiming at once cannot both win.
      const { data: claimed } = await admin
        .from("story_checks")
        .update({ offer_claimed_by: userId, offer_claimed_at: now.toISOString() })
        .eq("id", row.id)
        .is("offer_claimed_by", null)
        .select(OFFER_COLUMNS)
        .maybeSingle();
      if (!claimed) return null;
      return summarise(userId, claimed as OfferRow);
    }
    return summarise(userId, row);
  } catch (error) {
    console.error("Leader offer claim failed:", error);
    return null;
  }
}

/** The most recent live offer this account has claimed, if any. */
async function claimedOffer(userId: string, now: Date): Promise<OfferRow | null> {
  const { data } = await createAdminSupabase()
    .from("story_checks")
    .select(OFFER_COLUMNS)
    .eq("offer_claimed_by", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  return ((data ?? []) as OfferRow[]).find((row) => canUseOffer(row, now) && row.user_id !== userId) ?? null;
}

export async function leaderOfferFor(userId: string, now = new Date()): Promise<LeaderOfferSummary | null> {
  if (!userId) return null;
  try {
    const row = await claimedOffer(userId, now);
    return row ? summarise(userId, row) : null;
  } catch (error) {
    console.error("Leader offer lookup failed:", error);
    return null;
  }
}

export type InviteFromOfferResult =
  | { ok: true; summary: LeaderOfferSummary }
  | { ok: false; status: number; error: string };

/**
 * "Invite Sam": one tap, no address typed. The invitation is the one the email
 * form makes, to her account's address, which never leaves the server.
 */
export async function inviteFromLeaderOffer(userId: string, now = new Date()): Promise<InviteFromOfferResult> {
  const row = await claimedOffer(userId, now);
  if (!row) return { ok: false, status: 404, error: "There is no educator waiting to be invited from here." };
  const membership = await getMembership(userId);
  if (!membership || !canManageTeam(membership)) {
    return { ok: false, status: 403, error: "Set up your centre first, then invite them." };
  }
  const centre = await getCentre(membership.centreId);
  if (!centre) return { ok: false, status: 404, error: "Centre not found." };

  const account = await educatorAccount(row.user_id);
  const name = account.firstName;
  const status = await statusFor(userId, row, account.email);
  if (status === "joined" || status === "invited") return { ok: true, summary: { educator: name, centreName: cleanCentreName(row.centre_name ?? ""), status } };

  const generic = `${name} could not be invited from here. Ask ${name} for an email address and invite them below.`;
  if (!account.email) return { ok: false, status: 409, error: generic };
  // One centre per educator, as for every invitation. The answer is the same
  // sentence whatever the reason, so it says nothing about her account.
  if (await getMembership(row.user_id)) return { ok: false, status: 409, error: generic };

  const activeMembers = await countActiveMembers(centre.id);
  if (seatsRemaining(centre.seatLimit, activeMembers) <= 0) {
    return {
      ok: false,
      status: 409,
      error: centre.plan
        ? `All ${centre.seatLimit} seats are in use. Remove someone or move up a plan.`
        : "Seats for your team come with the centre plan. Start the free month above, then invite them here.",
    };
  }

  const made = await createCentreInvite({ centre, email: account.email, role: "educator", invitedBy: userId, fromLeaderOffer: true });
  if (!made.ok) return { ok: false, status: 500, error: "Could not create the invitation. Try again." };
  await createAdminSupabase().from("story_checks").update({ offer_invited_at: now.toISOString() }).eq("id", row.id)
    .then(undefined, (error: unknown) => console.error("Offer invite not marked:", error));
  return { ok: true, summary: { educator: name, centreName: cleanCentreName(row.centre_name ?? ""), status: "invited" } };
}
