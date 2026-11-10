import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey } from "@/lib/plans";

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
  ownerId?: string | null;
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
// What a seat is worth (10 Nov 2026).
//
// Until now joining a centre added a row and changed nothing else: an educator
// who accepted an invite stayed on their own plan, so a centre on its free
// month would have watched its team stop at three stories each. No centre had
// been created yet, so nobody met it. These two rules are the fix, and they are
// pure so they can be tested without a database.
// ---------------------------------------------------------------------------

/** Statuses on which a subscription still gives access (past due is the grace period, see lib/billing-access.ts). */
const LIVE_SUBSCRIPTION = new Set(["active", "trialing", "past_due", "admin_override"]);
const CENTRE_SEATS: Record<string, number> = { centre_starter: 10, centre_growth: 25 };

export type CentrePlanKey = "centre_starter" | "centre_growth";
export type CentreOwnerBilling = { plan: string | null | undefined; subscription_status: string | null | undefined };

/** The centre plan its owner holds right now, or null if they hold none that is live. */
export function liveCentrePlan(owner: CentreOwnerBilling | null | undefined): CentrePlanKey | null {
  if (!owner) return null;
  const plan = normalizePlanKey(owner.plan);
  if (plan !== "centre_starter" && plan !== "centre_growth") return null;
  return LIVE_SUBSCRIPTION.has(owner.subscription_status ?? "") ? plan : null;
}

/**
 * The centre plan that covers this educator, or null.
 *
 * Covered means: an active member of a centre whose OWNER holds a live centre
 * plan, and on the free plan themselves. An educator who pays for their own plan
 * keeps it exactly as it is (their billing is theirs), and the owner is never
 * "covered": the plan is already their own. The moment the owner's plan ends,
 * for any reason, cover ends with it and the member is on their own plan again
 * with every story kept.
 */
export function centreCover(input: {
  userId: string;
  ownPlan: string | null | undefined;
  membership: Membership | null;
  centreOwnerId: string | null | undefined;
  owner: CentreOwnerBilling | null | undefined;
}): CentrePlanKey | null {
  const { membership } = input;
  if (!input.userId || !membership || membership.status !== "active") return null;
  if (membership.userId !== input.userId) return null;
  if (!input.centreOwnerId || input.centreOwnerId === input.userId) return null;
  // The same reading of "free" every other gate uses (lib/story-limits.ts).
  if (normalizePlanKey(input.ownPlan) !== "free") return null;
  return liveCentrePlan(input.owner);
}

/**
 * How many educators a centre may hold today. It follows the owner's plan as
 * it is now, not as it was when the centre was named: a centre created before
 * its plan started was stuck at one seat for good.
 */
export function liveSeatLimit(owner: CentreOwnerBilling | null | undefined): number {
  const plan = liveCentrePlan(owner);
  return plan ? CENTRE_SEATS[plan] : 1;
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

/**
 * A centre, with its plan and seats as they are TODAY: read from the owner's
 * own subscription, never from what was stored when the centre was named.
 */
export async function getCentre(centreId: string): Promise<Centre | null> {
  if (!centreId) return null;
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("centres")
      .select("id, name, created_by")
      .eq("id", centreId)
      .maybeSingle();
    if (error || !data) return null;
    const owner = await getCentreOwnerBilling(data.created_by);
    return { id: data.id, name: data.name, plan: liveCentrePlan(owner), seatLimit: liveSeatLimit(owner), ownerId: data.created_by ?? null };
  } catch {
    return null;
  }
}

async function getCentreOwnerBilling(ownerId: string | null | undefined): Promise<CentreOwnerBilling | null> {
  if (!ownerId) return null;
  try {
    const { data, error } = await createAdminSupabase()
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", ownerId)
      .maybeSingle();
    if (error || !data) return null;
    return { plan: data.plan ?? null, subscription_status: data.subscription_status ?? null };
  } catch {
    return null;
  }
}

/**
 * The centre plan covering this educator, with the centre's name, or null.
 * Null on every failure: a lookup that breaks must never hand out a paid plan.
 * Asks nothing of the database for anyone who is not on the free plan.
 */
export async function getCentreCover(userId: string, ownPlan: string | null | undefined): Promise<{ plan: CentrePlanKey; centreId: string; centreName: string } | null> {
  if (!userId || normalizePlanKey(ownPlan) !== "free") return null;
  try {
    const membership = await getMembership(userId);
    if (!membership) return null;
    const { data, error } = await createAdminSupabase()
      .from("centres")
      .select("id, name, created_by")
      .eq("id", membership.centreId)
      .maybeSingle();
    if (error || !data) return null;
    const owner = await getCentreOwnerBilling(data.created_by);
    const plan = centreCover({ userId, ownPlan, membership, centreOwnerId: data.created_by, owner });
    return plan ? { plan, centreId: data.id, centreName: data.name } : null;
  } catch (error) {
    console.error("Centre cover lookup threw:", error);
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

/**
 * Every educator a live centre plan is covering right now (owners excluded).
 * For the email automation, so nobody whose centre pays is asked to pay. An
 * empty set on any failure: the worst case is the behaviour before this existed.
 */
export async function listCoveredMemberIds(): Promise<Set<string>> {
  const covered = new Set<string>();
  try {
    const admin = createAdminSupabase();
    const { data: members, error } = await admin.from("centre_members").select("centre_id, user_id").eq("status", "active").limit(5000);
    if (error || !members?.length) return covered;
    const centreIds = [...new Set(members.map((row) => row.centre_id as string))];
    const { data: centres } = await admin.from("centres").select("id, created_by").in("id", centreIds);
    const ownerIds = [...new Set((centres ?? []).map((row) => row.created_by as string).filter(Boolean))];
    if (!ownerIds.length) return covered;
    const { data: owners } = await admin.from("profiles").select("id, plan, subscription_status").in("id", ownerIds);
    const liveOwner = new Set((owners ?? []).filter((row) => liveCentrePlan(row)).map((row) => row.id as string));
    const ownerOf = new Map((centres ?? []).map((row) => [row.id as string, row.created_by as string]));
    for (const row of members) {
      const owner = ownerOf.get(row.centre_id as string);
      if (owner && liveOwner.has(owner) && row.user_id !== owner) covered.add(row.user_id as string);
    }
  } catch (error) {
    console.error("Covered member list failed:", error);
  }
  return covered;
}
