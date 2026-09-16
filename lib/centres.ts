import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Centre team model: who may see whose work.
 *
 * Context that sets the bar for this file: the database has NO row level
 * security. Not one policy, not one table with RLS enabled. Every query runs
 * through the service-role client, so a forgotten filter is not caught by
 * Postgres, it is a data leak about children. That is why the decision logic
 * below is a set of pure functions with no database access, exercised directly
 * by tests, rather than conditions sprinkled through route handlers.
 *
 * Two rules, both deny-by-default:
 *
 *   CONTENT IS OPT IN. A centre buying seats does not buy the right to read an
 *   educator's drafts. Admins always see activity (counts, recency), which is
 *   what rollout visibility actually needs, and see story content only for
 *   educators who switched sharing on themselves.
 *
 *   SAME CENTRE, ACTIVE, BOTH SIDES. Any missing membership, any removed
 *   member, any mismatched centre, and the answer is no.
 *
 * The whole module degrades to "nobody is in a centre" if the migration has not
 * been run, so this is safe to ship before the tables exist.
 */

export type CentreRole = "owner" | "admin" | "educator";
export type MemberStatus = "active" | "removed";

export type Membership = {
  centreId: string;
  userId: string;
  role: CentreRole;
  status: MemberStatus;
  sharesStories: boolean;
};

export type Centre = {
  id: string;
  name: string;
  plan: string | null;
  seatLimit: number;
};

// ---------------------------------------------------------------------------
// Pure decisions. No database, no async, no excuses. These are the security
// boundary and they are tested directly.
// ---------------------------------------------------------------------------

/** Admin-ish roles may manage the team. Educators may not. */
export function canManageTeam(viewer: Membership | null): boolean {
  if (!viewer || viewer.status !== "active") return false;
  return viewer.role === "owner" || viewer.role === "admin";
}

/** Only the owner may change billing or delete the centre. */
export function canManageBilling(viewer: Membership | null): boolean {
  if (!viewer || viewer.status !== "active") return false;
  return viewer.role === "owner";
}

/**
 * May `viewer` read the ACTIVITY of `author` — counts and recency, never text?
 * True for yourself, and for an admin or owner over an active member of the
 * same centre.
 */
export function canReadActivity(
  viewerUserId: string,
  authorUserId: string,
  viewer: Membership | null,
  author: Membership | null,
): boolean {
  if (viewerUserId && viewerUserId === authorUserId) return true;
  if (!viewer || !author) return false;
  if (viewer.status !== "active" || author.status !== "active") return false;
  if (!viewer.centreId || viewer.centreId !== author.centreId) return false;
  return viewer.role === "owner" || viewer.role === "admin";
}

/**
 * May `viewer` read the actual STORY CONTENT written by `author`?
 *
 * Everything canReadActivity requires, plus the author's own explicit consent.
 * An educator never reads a colleague's drafts regardless of consent: sharing
 * is with the centre's leadership for moderation and support, not with the
 * whole staff room.
 */
export function canReadStoryContent(
  viewerUserId: string,
  authorUserId: string,
  viewer: Membership | null,
  author: Membership | null,
): boolean {
  if (viewerUserId && viewerUserId === authorUserId) return true;
  if (!canReadActivity(viewerUserId, authorUserId, viewer, author)) return false;
  // Strict true. An undefined or null flag is a no.
  return author?.sharesStories === true;
}

/** Seats left, never negative. A centre at its limit cannot accept an invite. */
export function seatsRemaining(seatLimit: number, activeMembers: number): number {
  if (!Number.isFinite(seatLimit) || !Number.isFinite(activeMembers)) return 0;
  return Math.max(0, Math.floor(seatLimit) - Math.max(0, Math.floor(activeMembers)));
}

export function canAcceptInvite(opts: {
  seatLimit: number;
  activeMembers: number;
  expiresAt: string | Date | null;
  acceptedAt: string | Date | null;
  revokedAt: string | Date | null;
  now: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (opts.acceptedAt) return { ok: false, reason: "already_accepted" };
  if (opts.revokedAt) return { ok: false, reason: "revoked" };
  if (!opts.expiresAt) return { ok: false, reason: "no_expiry" };
  const expires = opts.expiresAt instanceof Date ? opts.expiresAt : new Date(opts.expiresAt);
  if (Number.isNaN(expires.getTime())) return { ok: false, reason: "bad_expiry" };
  if (expires.getTime() <= opts.now.getTime()) return { ok: false, reason: "expired" };
  if (seatsRemaining(opts.seatLimit, opts.activeMembers) <= 0) return { ok: false, reason: "no_seats" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Database access. Thin, and every one of these fails closed.
// ---------------------------------------------------------------------------

/** The migration may not have been run yet. That is not an error, it is "no centres". */
function isMissingCentreTables(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  const message = error.message ?? "";
  return /does not exist/i.test(message) && /centre/i.test(message);
}

function toRole(value: unknown): CentreRole {
  return value === "owner" || value === "admin" ? value : "educator";
}

function toStatus(value: unknown): MemberStatus {
  return value === "active" ? "active" : "removed";
}

/**
 * This user's active membership, or null. Null is the safe answer and is what
 * every failure path returns: no tables, no row, a query error, anything.
 */
export async function getMembership(userId: string): Promise<Membership | null> {
  if (!userId) return null;
  try {
    const { data, error } = await createAdminSupabase()
      .from("centre_members")
      .select("centre_id, user_id, role, status, shares_stories")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      if (!isMissingCentreTables(error)) {
        console.error("Centre membership lookup failed:", error.message);
      }
      return null;
    }
    if (!data) return null;

    return {
      centreId: data.centre_id,
      userId: data.user_id,
      role: toRole(data.role),
      status: toStatus(data.status),
      sharesStories: data.shares_stories === true,
    };
  } catch (error) {
    console.error("Centre membership lookup threw:", error);
    return null;
  }
}

export async function getCentre(centreId: string): Promise<Centre | null> {
  if (!centreId) return null;
  try {
    const { data, error } = await createAdminSupabase()
      .from("centres")
      .select("id, name, plan, seat_limit")
      .eq("id", centreId)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, plan: data.plan ?? null, seatLimit: data.seat_limit ?? 0 };
  } catch {
    return null;
  }
}

export async function countActiveMembers(centreId: string): Promise<number> {
  if (!centreId) return 0;
  try {
    const { count, error } = await createAdminSupabase()
      .from("centre_members")
      .select("user_id", { count: "exact", head: true })
      .eq("centre_id", centreId)
      .eq("status", "active");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Every user id whose STORY CONTENT this viewer may read, always including
 * themselves. Returns just the viewer when they are in no centre, which is the
 * behaviour every existing account gets and is why this is safe to call from
 * anywhere.
 */
export async function listReadableAuthorIds(viewerId: string): Promise<string[]> {
  if (!viewerId) return [];
  const viewer = await getMembership(viewerId);
  if (!canManageTeam(viewer) || !viewer) return [viewerId];

  try {
    const { data, error } = await createAdminSupabase()
      .from("centre_members")
      .select("user_id, shares_stories, status, role, centre_id")
      .eq("centre_id", viewer.centreId)
      .eq("status", "active")
      .eq("shares_stories", true);
    if (error || !data) return [viewerId];

    const ids = new Set<string>([viewerId]);
    for (const row of data) {
      const author: Membership = {
        centreId: row.centre_id,
        userId: row.user_id,
        role: toRole(row.role),
        status: toStatus(row.status),
        sharesStories: row.shares_stories === true,
      };
      // Run the same pure decision rather than trusting the query's filters.
      if (canReadStoryContent(viewerId, row.user_id, viewer, author)) ids.add(row.user_id);
    }
    return [...ids];
  } catch {
    return [viewerId];
  }
}
