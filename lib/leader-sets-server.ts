import { LEADER_SOURCES_ON } from "@/lib/build-switches";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { cleanCheckComment, cleanCentreName, cleanLeaderName, coverView, looksLikeCheckToken, offerEnded, type CoverView } from "@/lib/story-check";
import { hashCheckToken, hashOfferRef, newCheckToken, offerRefFor } from "@/lib/story-check-token";
import { getOrCreateReferralCode } from "@/lib/referrals";
import {
  allAnswered,
  canAnswerSet,
  canReadSet,
  setExpiry,
  setPurgeDue,
  setView,
  type CleanPiece,
  type SetDecision,
  type SetItemRow,
  type SetRow,
  type SetView,
} from "@/lib/leader-sets";
import { alreadyInCentre, wasEmailed } from "@/lib/story-check-server";
import { forgetLeaderAddressOnOpen } from "@/lib/email/leader-check";

/**
 * Server side of a whole room on one link (lib/leader-sets.ts). Service role
 * only: the tables have RLS on and no policies.
 */

const SET_COLUMNS = "id, user_id, status, centre_name, join_consent, show_sources, created_at, opened_at, expires_at, revoked_at, purged_at";
const ITEM_COLUMNS = "position, mode, framework, child_first_name, note, draft, decision, comment, decided_at";

export type FoundSet = SetRow & { offer_ref_hash: string | null };

export async function findSet(token: string): Promise<FoundSet | null> {
  if (!looksLikeCheckToken(token)) return null;
  const { data } = await createAdminSupabase().from("leader_sets").select(`${SET_COLUMNS}, offer_ref_hash`).eq("token_hash", hashCheckToken(token)).maybeSingle();
  return (data as FoundSet | null) ?? null;
}

async function itemsOf(setId: string): Promise<SetItemRow[]> {
  const { data } = await createAdminSupabase().from("leader_set_items").select(ITEM_COLUMNS).eq("set_id", setId).order("position", { ascending: true }).limit(30);
  return (data ?? []) as SetItemRow[];
}

async function educatorName(userId: string) {
  const { data } = await createAdminSupabase().from("profiles").select("full_name, plan").eq("id", userId).maybeSingle();
  return { name: (data?.full_name as string | null) ?? null, plan: (data?.plan as string | null) ?? null };
}

export async function coverForSet(set: FoundSet, now = new Date()): Promise<CoverView | null> {
  if (!canReadSet(set, now)) return null;
  const [{ name }, { count }] = await Promise.all([
    educatorName(set.user_id),
    createAdminSupabase().from("leader_set_items").select("id", { count: "exact", head: true }).eq("set_id", set.id),
  ]);
  return coverView({ kind: "set", check: { status: set.status === "answered" ? "approved" : set.status, expires_at: set.expires_at, revoked_at: set.revoked_at, centre_name: set.centre_name }, educatorName: name, pieces: count ?? 1, now });
}

async function viewForSet(set: FoundSet, token: string, now: Date): Promise<SetView> {
  const [items, educator] = await Promise.all([itemsOf(set.id), educatorName(set.user_id)]);
  if (offerEnded(set.offer_ref_hash) || (await alreadyInCentre(set.user_id, educator.plan))) {
    return setView({ set, items, educatorName: educator.name, now, offer: null });
  }
  const [code, emailed] = await Promise.all([
    getOrCreateReferralCode(set.user_id).catch(() => null),
    set.join_consent === true ? wasEmailed("set_id", set.id) : Promise.resolve(false),
  ]);
  return setView({ set, items, educatorName: educator.name, now, offer: { code, ref: offerRefFor(token), counts: null }, emailed });
}

/** The set a leader holding this key may read, recording the first open (the tap on the cover). */
export async function openLeaderSet(set: FoundSet, token: string, now = new Date()): Promise<SetView | null> {
  if (!canReadSet(set, now)) return null;
  if (set.status === "sent") {
    const { data } = await createAdminSupabase()
      .from("leader_sets")
      .update({ status: "opened", opened_at: now.toISOString() })
      .eq("id", set.id)
      .eq("status", "sent")
      .select(`${SET_COLUMNS}, offer_ref_hash`)
      .maybeSingle();
    if (data) {
      // First open: no reminder will go, so the leader's address is dropped now (R4-1).
      await forgetLeaderAddressOnOpen({ setId: set.id });
      return viewForSet(data as FoundSet, token, now);
    }
  }
  return viewForSet(set, token, now);
}

export type SetAnswerResult = { ok: true; view: SetView; answered: number } | { ok: false; reason: "gone" | "needs_comment" | "failed" | "not_found" };

/** Marks the set answered once every piece has a decision. Conditional, so it happens once. */
async function closeIfDone(set: FoundSet, now: Date) {
  const items = await itemsOf(set.id);
  if (!allAnswered(items)) return;
  await createAdminSupabase().from("leader_sets").update({ status: "answered" }).eq("id", set.id).neq("status", "answered")
    .then(undefined, (error: unknown) => console.error("Set close failed:", error));
  void now;
}

/** One piece answered, once: a second answer to the same piece changes nothing. */
export async function answerSetItem(
  token: string,
  input: { position: unknown; decision: SetDecision; name: unknown; comment: unknown },
  now = new Date(),
): Promise<SetAnswerResult> {
  const set = await findSet(token);
  if (!set || !canAnswerSet(set, now)) return { ok: false, reason: "gone" };
  const position = typeof input.position === "number" && Number.isInteger(input.position) ? input.position : NaN;
  if (!(position >= 1 && position <= 30)) return { ok: false, reason: "not_found" };
  const comment = cleanCheckComment(input.comment);
  if (input.decision === "changes" && !comment) return { ok: false, reason: "needs_comment" };
  const leader = cleanLeaderName(input.name);
  const { data, error } = await createAdminSupabase()
    .from("leader_set_items")
    .update({ decision: input.decision, comment: comment ? (leader ? `${leader}: ${comment}` : comment) : null, decided_at: now.toISOString() })
    .eq("set_id", set.id)
    .eq("position", position)
    .is("decision", null)
    .select("position");
  if (error) {
    console.error("Set answer failed:", error.message);
    return { ok: false, reason: "failed" };
  }
  await closeIfDone(set, now);
  const fresh = (await findSet(token)) ?? set;
  return { ok: true, view: await viewForSet(fresh, token, now), answered: (data ?? []).length };
}

/** "All look good": every piece not yet answered is approved, in one conditional update. Answered pieces are left alone. */
export async function answerSetAll(token: string, input: { name: unknown }, now = new Date()): Promise<SetAnswerResult> {
  const set = await findSet(token);
  if (!set || !canAnswerSet(set, now)) return { ok: false, reason: "gone" };
  void input;
  const { data, error } = await createAdminSupabase()
    .from("leader_set_items")
    .update({ decision: "approved", decided_at: now.toISOString() })
    .eq("set_id", set.id)
    .is("decision", null)
    .select("position");
  if (error) {
    console.error("Set answer all failed:", error.message);
    return { ok: false, reason: "failed" };
  }
  await closeIfDone(set, now);
  const fresh = (await findSet(token)) ?? set;
  return { ok: true, view: await viewForSet(fresh, token, now), answered: (data ?? []).length };
}

/**
 * Make a set from pieces the signed-in educator sends. The key is returned
 * once and only its hash is stored, like a story check's.
 */
export async function createLeaderSet(input: {
  userId: string;
  pieces: CleanPiece[];
  centreName: unknown;
  joinConsent: boolean;
  showSources?: boolean;
  now?: Date;
}): Promise<{ ok: true; token: string; setId: string } | { ok: false }> {
  const now = input.now ?? new Date();
  const admin = createAdminSupabase();
  const { token, hash } = newCheckToken();
  const { data: set, error } = await admin
    .from("leader_sets")
    .insert({
      user_id: input.userId,
      token_hash: hash,
      offer_ref_hash: hashOfferRef(offerRefFor(token)),
      centre_name: cleanCentreName(input.centreName) || null,
      join_consent: input.joinConsent,
      show_sources: LEADER_SOURCES_ON && input.showSources === true,
      expires_at: setExpiry(now).toISOString(),
    })
    .select("id")
    .single();
  if (error || !set) {
    console.error("Leader set create failed:", error?.message);
    return { ok: false };
  }
  const rows = input.pieces.map((piece) => ({
    set_id: set.id,
    position: piece.position,
    mode: piece.mode,
    framework: piece.framework,
    child_first_name: piece.childFirstName,
    note: piece.note,
    draft: piece.draft,
  }));
  const { error: itemsError } = await admin.from("leader_set_items").insert(rows);
  if (itemsError) {
    console.error("Leader set items failed:", itemsError.message);
    await admin.from("leader_sets").delete().eq("id", set.id);
    return { ok: false };
  }
  return { ok: true, token, setId: set.id as string };
}

/** The educator cancels a set: it stops opening at once, and its centre offer ends. */
export async function cancelLeaderSet(userId: string, setId: string, now = new Date()) {
  const { data, error } = await createAdminSupabase()
    .from("leader_sets")
    .update({ revoked_at: now.toISOString(), offer_ref_hash: `ended:${setId}`, offer_claimed_by: null, offer_claimed_at: null })
    .eq("id", setId)
    .eq("user_id", userId)
    .select("id");
  return !error && (data ?? []).length > 0;
}

/** Where the educator's recent sets stand, for her /statement panel: counts only. */
export async function recentSetsFor(userId: string, now = new Date()) {
  const admin = createAdminSupabase();
  const { data: sets } = await admin.from("leader_sets").select(SET_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
  const out: Array<{ id: string; sentAt: string; opened: boolean; pieces: number; approved: number; changes: number; open: boolean; comments: Array<{ childName: string; comment: string }> }> = [];
  for (const set of (sets ?? []) as SetRow[]) {
    const items = await itemsOf(set.id);
    out.push({
      id: set.id,
      sentAt: set.created_at,
      opened: Boolean(set.opened_at),
      pieces: items.length,
      approved: items.filter((i) => i.decision === "approved").length,
      changes: items.filter((i) => i.decision === "changes").length,
      open: canReadSet(set, now),
      comments: items.filter((i) => i.decision === "changes" && i.comment).map((i) => ({ childName: i.child_first_name ?? "", comment: i.comment ?? "" })),
    });
  }
  return out;
}

/**
 * Wipe the content of sets 7 days after they stopped opening, ran out or
 * cancelled (RULINGS.txt
 * answer 4): first names, notes, drafts and comments become null; decisions,
 * the set row and its offer stay. Called from the email cron.
 */
export async function purgeExpiredSets(now = new Date()): Promise<number> {
  const admin = createAdminSupabase();
  const before = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  // Ended means ran out OR cancelled: a cancelled set is wiped a week after the cancel (R1-12).
  const { data: due, error } = await admin.from("leader_sets").select("id, expires_at, revoked_at, purged_at").is("purged_at", null).or(`expires_at.lt.${before},revoked_at.lt.${before}`).limit(200);
  if (error || !due) return 0;
  let purged = 0;
  for (const row of due as Array<{ id: string; expires_at: string; revoked_at: string | null; purged_at: string | null }>) {
    if (!setPurgeDue(row, now)) continue;
    const { error: wipe } = await admin.from("leader_set_items").update({ child_first_name: null, note: null, draft: null, comment: null }).eq("set_id", row.id);
    if (wipe) { console.error("Set purge failed:", wipe.message); continue; }
    await admin.from("leader_sets").update({ purged_at: now.toISOString() }).eq("id", row.id);
    purged++;
  }
  return purged;
}
