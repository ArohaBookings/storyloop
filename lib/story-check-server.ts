import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  canAnswer,
  canReadThroughLink,
  cleanCheckComment,
  cleanLeaderName,
  educatorView,
  leaderView,
  looksLikeCheckToken,
  type CheckDecision,
  type CheckRow,
  type EducatorCheckView,
  type LeaderView,
} from "@/lib/story-check";
import { hashCheckToken } from "@/lib/story-check-token";

const COLUMNS = "id, story_id, user_id, status, leader_name, comment, created_at, opened_at, decided_at, expires_at, revoked_at";

async function findCheck(token: string): Promise<CheckRow | null> {
  if (!looksLikeCheckToken(token)) return null;
  const { data } = await createAdminSupabase().from("story_checks").select(COLUMNS).eq("token_hash", hashCheckToken(token)).maybeSingle();
  return (data as CheckRow | null) ?? null;
}

async function viewFor(check: CheckRow, now: Date): Promise<LeaderView | null> {
  const admin = createAdminSupabase();
  const [{ data: story }, { data: profile }] = await Promise.all([
    admin.from("stories").select("child_name, observations, story_text, outcomes, next_steps, created_at").eq("id", check.story_id).eq("user_id", check.user_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", check.user_id).maybeSingle(),
  ]);
  if (!story) return null;
  return leaderView({ story, check, educatorName: profile?.full_name ?? null, now });
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
    if (data) return viewFor(data as CheckRow, now);
  }
  return viewFor(check, now);
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
  const view = await viewFor(data as CheckRow, now);
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
