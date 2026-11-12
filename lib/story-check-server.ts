import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  canAnswer,
  canReadThroughLink,
  cleanCheckComment,
  cleanLeaderName,
  educatorView,
  leaderCounts,
  leaderView,
  looksLikeCheckToken,
  offerEnded,
  offerEndedMarker,
  type CheckDecision,
  type CheckRow,
  type EducatorCheckView,
  type LeaderCounts,
  type LeaderView,
} from "@/lib/story-check";
import { hashCheckToken, hashOfferRef, offerRefFor } from "@/lib/story-check-token";
import { getOrCreateReferralCode } from "@/lib/referrals";
import { getMembership } from "@/lib/centres";
import { isCentrePlan } from "@/lib/centre-offer";

export const CHECK_COLUMNS = "id, story_id, user_id, status, leader_name, comment, created_at, opened_at, decided_at, expires_at, revoked_at, centre_name, share_counts";
const COLUMNS = CHECK_COLUMNS;

type FoundCheck = CheckRow & { offer_ref_hash?: string | null };

async function findCheck(token: string): Promise<FoundCheck | null> {
  if (!looksLikeCheckToken(token)) return null;
  const { data } = await createAdminSupabase().from("story_checks").select(`${COLUMNS}, offer_ref_hash`).eq("token_hash", hashCheckToken(token)).maybeSingle();
  return (data as FoundCheck | null) ?? null;
}

/**
 * The educator's own numbers for her leader (lib/story-check.ts leaderCounts),
 * only when she ticked the box. Never throws: no numbers is always a safe answer.
 */
async function countsFor(userId: string, now: Date): Promise<LeaderCounts | null> {
  try {
    const since = new Date(now.getTime() - 31 * 86_400_000);
    const { data: stories, error } = await createAdminSupabase()
      .from("stories")
      .select("child_name, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error || !stories) return null;
    return leaderCounts(stories as Array<{ child_name: string | null; created_at: string }>, { now });
  } catch (error) {
    console.error("Leader counts skipped:", error);
    return null;
  }
}

/**
 * Is the educator who sent this story already in a centre, or on a centre plan
 * herself? Then the leader is offered nothing: the story check is all the page
 * is. Errs towards no offer when it cannot tell.
 */
async function alreadyInCentre(userId: string, plan: string | null | undefined): Promise<boolean> {
  if (isCentrePlan(plan)) return true;
  try {
    return Boolean(await getMembership(userId));
  } catch {
    return true;
  }
}

/**
 * The page a leader holding this link sees, with the centre offer on it. The
 * offer reference is worked out from the link key the leader already holds
 * and stored only as a hash: checks made before 13 Nov 2026 get theirs the
 * first time they are opened.
 */
async function viewFor(check: CheckRow, now: Date, token: string, offerRefHash: string | null | undefined): Promise<LeaderView | null> {
  const admin = createAdminSupabase();
  const [{ data: story }, { data: profile }] = await Promise.all([
    admin.from("stories").select("child_name, observations, story_text, outcomes, next_steps, created_at").eq("id", check.story_id).eq("user_id", check.user_id).maybeSingle(),
    admin.from("profiles").select("full_name, plan").eq("id", check.user_id).maybeSingle(),
  ]);
  if (!story) return null;
  const educatorName = profile?.full_name ?? null;
  // No offer at all when the educator ended it (lib/story-check.ts offerEnded),
  // or when she is already in a centre or on a centre plan herself.
  if (offerEnded(offerRefHash) || (await alreadyInCentre(check.user_id, profile?.plan))) {
    return leaderView({ story, check, educatorName, now, offer: null });
  }
  const ref = offerRefFor(token);
  if (!offerRefHash) {
    await admin.from("story_checks").update({ offer_ref_hash: hashOfferRef(ref) }).eq("id", check.id).is("offer_ref_hash", null)
      .then(undefined, (error: unknown) => console.error("Offer reference not stored:", error));
  }
  const [code, counts] = await Promise.all([
    getOrCreateReferralCode(check.user_id).catch(() => null),
    check.share_counts === true ? countsFor(check.user_id, now) : Promise.resolve(null),
  ]);
  return leaderView({ story, check, educatorName, now, offer: { code, ref, counts } });
}

/**
 * What a leader holding this link may see, or null when the link is unknown,
 * cancelled or past its 14 days. Every "no" looks the same from outside, so a
 * guessed link learns nothing. The first open is recorded for the educator.
 */
export async function openLeaderCheck(token: string, now = new Date()): Promise<LeaderView | null> {
  const check = await findCheck(token);
  if (!check || !canReadThroughLink(check, now)) return null;
  if (check.status === "sent") {
    const { data } = await createAdminSupabase()
      .from("story_checks")
      .update({ status: "opened", opened_at: now.toISOString() })
      .eq("id", check.id)
      .eq("status", "sent")
      .select(COLUMNS)
      .maybeSingle();
    if (data) return viewFor(data as CheckRow, now, token, check.offer_ref_hash);
  }
  return viewFor(check, now, token, check.offer_ref_hash);
}

/**
 * Record the leader's answer, once. The update is conditional on the check
 * still being unanswered, so two tabs or a double tap cannot overwrite the
 * first answer with a second.
 */
export async function answerLeaderCheck(
  token: string,
  input: { decision: CheckDecision; name: unknown; comment: unknown },
  now = new Date(),
): Promise<{ ok: true; view: LeaderView } | { ok: false; reason: "gone" | "needs_comment" | "failed" }> {
  const check = await findCheck(token);
  if (!check || !canAnswer(check, now)) return { ok: false, reason: "gone" };
  const comment = cleanCheckComment(input.comment);
  if (input.decision === "changes" && !comment) return { ok: false, reason: "needs_comment" };
  const { data, error } = await createAdminSupabase()
    .from("story_checks")
    .update({ status: input.decision, leader_name: cleanLeaderName(input.name) || null, comment: comment || null, decided_at: now.toISOString() })
    .eq("id", check.id)
    .in("status", ["sent", "opened"])
    .is("revoked_at", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    console.error("Leader check answer failed:", error.message);
    return { ok: false, reason: "failed" };
  }
  if (!data) return { ok: false, reason: "gone" };
  const view = await viewFor(data as CheckRow, now, token, check.offer_ref_hash);
  return view ? { ok: true, view } : { ok: false, reason: "gone" };
}

/**
 * Where each of an educator's stories stands with its latest check, for the
 * history page, in one query. Never throws: if the table is not there yet (the
 * migration runs with the release), every story simply shows no check.
 */
export async function latestChecksByStory(userId: string, now = new Date()): Promise<Record<string, EducatorCheckView>> {
  try {
    const { data, error } = await createAdminSupabase()
      .from("story_checks")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error || !data) return {};
    const out: Record<string, EducatorCheckView> = {};
    for (const row of data as CheckRow[]) {
      if (!out[row.story_id]) out[row.story_id] = educatorView(row, now);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The educator's own control over a story's links (13 Nov 2026 review).
 *
 * `cancel` (DELETE, "Cancel the link"): every link for this story stops
 * opening it, answered or not. `replace` (a new link is being made): only the
 * unanswered ones stop, as before. Either way, EVERY check for the story, in
 * any state, loses its centre offer: the reference is replaced by a marker
 * that matches no reference and is never filled in again, and any claim on it
 * is cleared. A leader who had claimed it sees no educator to invite. No
 * migration: the marker lives in the existing offer_ref_hash column.
 */
export async function endStoryLinks(storyId: string, userId: string, mode: "cancel" | "replace", now = new Date()): Promise<{ ok: boolean }> {
  const admin = createAdminSupabase();
  let revoke = admin
    .from("story_checks")
    .update({ revoked_at: now.toISOString() })
    .eq("story_id", storyId)
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (mode === "replace") revoke = revoke.in("status", ["sent", "opened"]);
  const { error: revokeError } = await revoke;
  if (revokeError) {
    console.error("Leader check revoke failed:", revokeError.message);
    return { ok: false };
  }
  const { data: rows, error: listError } = await admin
    .from("story_checks")
    .select("id, offer_ref_hash, offer_claimed_by")
    .eq("story_id", storyId)
    .eq("user_id", userId)
    .limit(200);
  if (listError) {
    console.error("Leader offer end failed:", listError.message);
    return { ok: false };
  }
  let ok = true;
  for (const row of (rows ?? []) as Array<{ id: string; offer_ref_hash: string | null; offer_claimed_by: string | null }>) {
    if (offerEnded(row.offer_ref_hash) && !row.offer_claimed_by) continue;
    const { error } = await admin
      .from("story_checks")
      .update({ offer_ref_hash: offerEndedMarker(row.id), offer_claimed_by: null, offer_claimed_at: null })
      .eq("id", row.id);
    if (error) {
      console.error("Leader offer end failed:", error.message);
      ok = false;
    }
  }
  return { ok };
}
