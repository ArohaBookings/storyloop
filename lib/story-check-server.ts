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
  type CheckDecision,
  type CheckRow,
  type EducatorCheckView,
  type LeaderCounts,
  type LeaderView,
} from "@/lib/story-check";
import { hashCheckToken, hashOfferRef, offerRefFor } from "@/lib/story-check-token";
import { getOrCreateReferralCode } from "@/lib/referrals";
import { parseTermSettings } from "@/lib/term-settings";
import { latestStartedTerm, localDate } from "@/lib/terms";

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
    const admin = createAdminSupabase();
    const { data: profile } = await admin.from("profiles").select("term_settings, story_preferences").eq("id", userId).maybeSingle();
    const framework = (profile?.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
    const settings = parseTermSettings(profile?.term_settings, framework);
    const today = localDate(now, settings.jurisdiction);
    const term = today ? latestStartedTerm(today, settings.jurisdiction) : null;
    // From whichever is earlier: 30 days ago, or the start of this term.
    const since30 = new Date(now.getTime() - 31 * 86_400_000);
    const termStart = term ? new Date(`${term.start}T00:00:00Z`) : since30;
    const since = new Date(Math.min(since30.getTime(), termStart.getTime() - 86_400_000));
    const { data: stories, error } = await admin
      .from("stories")
      .select("child_name, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error || !stories) return null;
    return leaderCounts(stories as Array<{ child_name: string | null; created_at: string }>, {
      now,
      jurisdiction: settings.jurisdiction,
      followsSchoolTerms: settings.followsSchoolTerms,
    });
  } catch (error) {
    console.error("Leader counts skipped:", error);
    return null;
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
    admin.from("profiles").select("full_name").eq("id", check.user_id).maybeSingle(),
  ]);
  if (!story) return null;
  const ref = offerRefFor(token);
  if (!offerRefHash) {
    await admin.from("story_checks").update({ offer_ref_hash: hashOfferRef(ref) }).eq("id", check.id).is("offer_ref_hash", null)
      .then(undefined, (error: unknown) => console.error("Offer reference not stored:", error));
  }
  const [code, counts] = await Promise.all([
    getOrCreateReferralCode(check.user_id).catch(() => null),
    check.share_counts === true ? countsFor(check.user_id, now) : Promise.resolve(null),
  ]);
  return leaderView({ story, check, educatorName: profile?.full_name ?? null, now, offer: { code, ref, counts } });
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
