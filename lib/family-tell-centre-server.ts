import { createAdminSupabase } from "@/lib/supabase/admin";
import { hashCheckToken } from "@/lib/story-check-token";
import { looksLikeFamilyToken } from "@/lib/family-link";

/**
 * The database side of Tell your centre (lib/family-tell-centre.ts): the one
 * switch on a family link (family_links.tell_centre, 20261119_family_tell_centre.sql).
 * Kept apart from lib/family-link-server.ts, which this never changes. Every
 * failure answers "off": a button the educator did not choose must never show.
 */

/** Whether the family holding this link sees "Tell your centre": an open link its educator switched on. */
export async function tellCentreForToken(token: string, now = new Date()): Promise<boolean> {
  if (!looksLikeFamilyToken(token)) return false;
  try {
    const { data, error } = await createAdminSupabase()
      .from("family_links")
      .select("tell_centre, expires_at, revoked_at")
      .eq("token_hash", hashCheckToken(token))
      .maybeSingle();
    if (error || !data) return false;
    if (data.revoked_at || !(new Date(data.expires_at as string).getTime() > now.getTime())) return false;
    return data.tell_centre === true;
  } catch {
    return false;
  }
}

/** The switch on each of this educator's links for one child: { linkId: on }. Off when it cannot be read. */
export async function tellCentreByLink(userId: string, childId: string): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await createAdminSupabase()
      .from("family_links")
      .select("id, tell_centre")
      .eq("user_id", userId)
      .eq("child_id", childId);
    if (error || !data) return {};
    return Object.fromEntries(data.map((row) => [row.id as string, row.tell_centre === true]));
  } catch {
    return {};
  }
}

/** Switch it on or off for one of her own open links. False when there is no such link. */
export async function setTellCentre(userId: string, childId: string, linkId: string, on: boolean, now = new Date()): Promise<boolean> {
  try {
    const { data, error } = await createAdminSupabase()
      .from("family_links")
      .update({ tell_centre: on })
      .eq("id", linkId)
      .eq("user_id", userId)
      .eq("child_id", childId)
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString())
      .select("id");
    return !error && (data ?? []).length === 1;
  } catch {
    return false;
  }
}
