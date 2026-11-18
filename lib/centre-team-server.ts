import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership, listReadableAuthorIds, type Membership } from "@/lib/centres";
import {
  canLinkProfiles,
  canReviewStory,
  cleanCentreChildName,
  decideTeamScope,
  mergeTeamChildren,
  readReviewInput,
  sampleTeamState,
  teamAccess,
  type CentreChildLinkRow,
  type CentreChildRow,
  type TeamAccess,
  type TeamChild,
  type TeamChildProfile,
  type TeamScope,
  type SameNameSuggestion,
} from "@/lib/centre-team";
import { educatorFirstName } from "@/lib/story-check";
import { recordServerEvent } from "@/lib/analytics/server";
import type { AuthorReviewView, TeamQueueItem, TeamReviewView } from "@/lib/team-queue";
import { evidenceStoryFromRow, type EvidenceStory } from "@/lib/evidence-pack";

/**
 * The database side of a leader's team views (18 Nov 2026). Every function
 * asks lib/centre-team.ts what it may read and reads nothing else. The tables
 * are reached through the service role because the stories policy lets each
 * educator read only her own rows; that is exactly why the pure checks decide.
 * Every failure answers "nothing team-wide", never "everything".
 */

export type TeamContext = {
  viewerId: string;
  viewer: Membership | null;
  access: TeamAccess;
  centre: { id: string; name: string; sampleTeamAt: string | null } | null;
  /** Only when access is "team". */
  scope: TeamScope | null;
  otherMembers: number;
  pendingInvites: number;
  isLeader: boolean;
  sample: { offer: boolean; show: boolean };
};

const NONE: Omit<TeamContext, "viewerId"> = {
  viewer: null,
  access: { kind: "none" },
  centre: null,
  scope: null,
  otherMembers: 0,
  pendingInvites: 0,
  isLeader: false,
  sample: { offer: false, show: false },
};

function toMembership(row: { centre_id: string; user_id: string; role: unknown; status: unknown; shares_stories: unknown }): Membership {
  return {
    centreId: row.centre_id,
    userId: row.user_id,
    role: row.role === "owner" || row.role === "admin" ? row.role : "educator",
    status: row.status === "active" ? "active" : "removed",
    sharesStories: row.shares_stories === true,
  };
}

/** The column may not exist yet where the migration has not been run: read without it. */
async function readCentre(centreId: string) {
  const admin = createAdminSupabase();
  const full = await admin.from("centres").select("id, name, created_by, sample_team_at").eq("id", centreId).maybeSingle();
  if (!full.error) return full.data as { id: string; name: string; created_by: string | null; sample_team_at: string | null } | null;
  const basic = await admin.from("centres").select("id, name, created_by").eq("id", centreId).maybeSingle();
  return basic.data ? { ...(basic.data as { id: string; name: string; created_by: string | null }), sample_team_at: null } : null;
}

/** Everything the team views need to decide what to show. Never throws. */
export async function getTeamContext(viewerId: string): Promise<TeamContext> {
  if (!viewerId) return { viewerId, ...NONE };
  try {
    const viewer = await getMembership(viewerId);
    if (!viewer) return { viewerId, ...NONE };
    const centreRow = await readCentre(viewer.centreId);
    if (!centreRow) return { viewerId, ...NONE };

    const admin = createAdminSupabase();
    const [{ data: owner }, { data: memberRows }, { count: pending }] = await Promise.all([
      centreRow.created_by
        ? admin.from("profiles").select("plan, subscription_status").eq("id", centreRow.created_by).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("centre_members").select("centre_id, user_id, role, status, shares_stories").eq("centre_id", centreRow.id).eq("status", "active"),
      admin
        .from("centre_invites")
        .select("id", { count: "exact", head: true })
        .eq("centre_id", centreRow.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);

    const members = (memberRows ?? []).map(toMembership);
    const access = teamAccess({ viewerId, viewer, owner: owner ?? null });
    const scope = access.kind === "team"
      ? decideTeamScope({ viewerId, viewer, access, readableIds: await listReadableAuthorIds(viewerId), members })
      : null;
    const otherMembers = members.filter((member) => member.userId !== viewerId).length;
    const isLeader = access.kind === "team" || access.kind === "lapsed";
    return {
      viewerId,
      viewer,
      access,
      centre: { id: centreRow.id, name: centreRow.name, sampleTeamAt: centreRow.sample_team_at ?? null },
      scope,
      otherMembers,
      pendingInvites: pending ?? 0,
      isLeader,
      sample: sampleTeamState({ isLeader, sampleTeamAt: centreRow.sample_team_at, otherMembers, pendingInvites: pending ?? 0 }),
    };
  } catch (error) {
    console.error("Team context failed:", error instanceof Error ? error.message : "unknown");
    return { viewerId, ...NONE };
  }
}

async function firstNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (!ids.length) return names;
  const { data } = await createAdminSupabase().from("profiles").select("id, full_name").in("id", ids);
  for (const row of data ?? []) names.set(row.id as string, educatorFirstName(row.full_name as string | null));
  return names;
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

/** The leader's queue: shared stories from her team, newest first. Empty unless she has team access. */
export async function loadTeamQueue(ctx: TeamContext, limit = 40): Promise<TeamQueueItem[]> {
  const scope = ctx.scope;
  if (!scope || !scope.reviewAuthorIds.length || !ctx.centre) return [];
  try {
    const admin = createAdminSupabase();
    const { data: stories } = await admin
      .from("stories")
      .select("id, user_id, child_name, story_text, observations, outcomes, created_at")
      .in("user_id", scope.reviewAuthorIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    const allowed = new Set(scope.reviewAuthorIds);
    const rows = (stories ?? []).filter((row) => allowed.has(row.user_id as string));
    if (!rows.length) return [];

    const { data: reviews } = await admin
      .from("centre_story_reviews")
      .select("story_id, status, note, reviewer_id, updated_at")
      .eq("centre_id", ctx.centre.id)
      .in("story_id", rows.map((row) => row.id as string));
    const reviewerIds = [...new Set((reviews ?? []).map((row) => row.reviewer_id as string | null).filter((id): id is string => Boolean(id)))];
    const names = await firstNames([...new Set([...rows.map((row) => row.user_id as string), ...reviewerIds])]);
    const reviewOf = new Map((reviews ?? []).map((row) => [row.story_id as string, row]));

    return rows.map((row) => {
      const review = reviewOf.get(row.id as string);
      const view: TeamReviewView | null = review
        ? {
            status: review.status === "note" ? "note" : "looks_good",
            note: (review.note as string | null) ?? null,
            reviewer: review.reviewer_id === ctx.viewerId ? "You" : names.get(review.reviewer_id as string) ?? null,
            at: review.updated_at as string,
          }
        : null;
      return {
        id: row.id as string,
        author: names.get(row.user_id as string) ?? "An educator",
        childName: (row.child_name as string | null) ?? null,
        createdAt: row.created_at as string,
        storyText: (row.story_text as string) ?? "",
        note: (row.observations as string | null) ?? null,
        outcomes: asStrings(row.outcomes).slice(0, 4),
        review: view,
      };
    });
  } catch (error) {
    console.error("Team queue failed:", error instanceof Error ? error.message : "unknown");
    return [];
  }
}

/** How many stories the private members wrote since a date: a total, never a story. */
export async function countPrivateStories(ctx: TeamContext, sinceIso: string): Promise<number> {
  const ids = ctx.scope?.privateMemberIds ?? [];
  if (!ids.length) return 0;
  try {
    const { count } = await createAdminSupabase()
      .from("stories")
      .select("id", { count: "exact", head: true })
      .in("user_id", ids)
      .gte("created_at", sinceIso);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type SaveReviewResult =
  | { ok: true; review: TeamReviewView }
  | { ok: false; status: number; error: string };

/** A leader marks a story "looks good" or leaves a note. Refused unless lib/centre-team.ts says yes. */
export async function saveTeamReview(viewerId: string, storyId: string, raw: unknown): Promise<SaveReviewResult> {
  const input = readReviewInput(raw);
  if ("error" in input) return { ok: false, status: 400, error: input.error };
  const ctx = await getTeamContext(viewerId);
  if (ctx.access.kind !== "team" || !ctx.centre) {
    return { ok: false, status: 403, error: ctx.access.kind === "lapsed" ? "Your centre's plan is not running, so team stories are closed." : "Only your centre's leaders can do that." };
  }
  const admin = createAdminSupabase();
  const { data: story } = await admin.from("stories").select("id, user_id").eq("id", storyId).maybeSingle();
  // The same answer for "no such story" and "not yours to see": nothing is revealed.
  const notFound: SaveReviewResult = { ok: false, status: 404, error: "That story is not shared with you." };
  if (!story) return notFound;
  const author = await getMembership(story.user_id as string);
  if (!canReviewStory({ viewerId, viewer: ctx.viewer, access: ctx.access, author, storyUserId: story.user_id as string })) return notFound;

  const now = new Date().toISOString();
  const { data: saved, error } = await admin
    .from("centre_story_reviews")
    .upsert(
      {
        centre_id: ctx.centre.id,
        story_id: story.id,
        author_id: story.user_id,
        reviewer_id: viewerId,
        status: input.status,
        note: input.note,
        updated_at: now,
        author_seen_at: null,
      },
      { onConflict: "centre_id,story_id" },
    )
    .select("status, note, updated_at")
    .single();
  if (error || !saved) {
    console.error("Team review save failed:", error?.code ?? "unknown");
    return { ok: false, status: 500, error: "That did not save. Try again." };
  }
  // Ids and a listed value only: never the note.
  await recordServerEvent(admin, {
    event: "centre_review_marked",
    userId: viewerId,
    path: "/team",
    metadata: { story_id: story.id, centre_id: ctx.centre.id, status: input.status },
  });
  return { ok: true, review: { status: input.status, note: input.note, reviewer: "You", at: saved.updated_at as string } };
}

/**
 * What the centre said about this author's stories, keyed by story. Her own
 * stories only. Marks them seen when asked to (the story list is open).
 */
export async function reviewsForAuthor(authorId: string, opts: { markSeen?: boolean } = {}): Promise<Record<string, AuthorReviewView>> {
  if (!authorId) return {};
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("centre_story_reviews")
      .select("story_id, centre_id, status, note, reviewer_id, updated_at, author_seen_at")
      .eq("author_id", authorId)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error || !data?.length) return {};
    const names = await firstNames([...new Set(data.map((row) => row.reviewer_id as string | null).filter((id): id is string => Boolean(id)))]);
    const centreIds = [...new Set(data.map((row) => row.centre_id as string))];
    const { data: centres } = await admin.from("centres").select("id, name").in("id", centreIds);
    const centreName = new Map((centres ?? []).map((row) => [row.id as string, row.name as string]));
    const result: Record<string, AuthorReviewView> = {};
    for (const row of data) {
      result[row.story_id as string] = {
        status: row.status === "note" ? "note" : "looks_good",
        note: (row.note as string | null) ?? null,
        reviewer: row.reviewer_id ? names.get(row.reviewer_id as string) ?? null : null,
        at: row.updated_at as string,
        centreName: centreName.get(row.centre_id as string) ?? null,
        seen: Boolean(row.author_seen_at),
      };
    }
    if (opts.markSeen && data.some((row) => !row.author_seen_at)) {
      await admin.from("centre_story_reviews").update({ author_seen_at: new Date().toISOString() }).eq("author_id", authorId).is("author_seen_at", null);
    }
    return result;
  } catch {
    return {};
  }
}

/** How many answers this author has not seen yet (for the bell). */
export async function unseenReviewCount(authorId: string): Promise<{ count: number; latest: string | null }> {
  if (!authorId) return { count: 0, latest: null };
  try {
    const { data } = await createAdminSupabase()
      .from("centre_story_reviews")
      .select("updated_at")
      .eq("author_id", authorId)
      .is("author_seen_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);
    return { count: data?.length ?? 0, latest: (data?.[0]?.updated_at as string | undefined) ?? null };
  } catch {
    return { count: 0, latest: null };
  }
}

// ------------------------------------------------------ team children

export type TeamChildren = {
  children: TeamChild[];
  keyOfProfile: Record<string, string>;
  suggestions: SameNameSuggestion[];
  profiles: TeamChildProfile[];
  /** Extra fields the planning board shows, by profile id. */
  details: Record<string, { ageGroup: string | null; interests: string[] }>;
};

/** The team's children, each counted once, from the authors the scope allows. */
export async function loadTeamChildren(ctx: TeamContext): Promise<TeamChildren> {
  const empty: TeamChildren = { children: [], keyOfProfile: {}, suggestions: [], profiles: [], details: {} };
  const scope = ctx.scope;
  if (!scope || !ctx.centre) return empty;
  try {
    const admin = createAdminSupabase();
    const [{ data: profileRows }, { data: centreRows }, { data: linkRows }] = await Promise.all([
      admin.from("child_profiles").select("id, name, user_id, age_group, interests").in("user_id", scope.authorIds).order("name").limit(2000),
      admin.from("centre_children").select("id, name").eq("centre_id", ctx.centre.id),
      admin.from("centre_child_links").select("child_profile_id, centre_child_id").eq("centre_id", ctx.centre.id),
    ]);
    const allowed = new Set(scope.authorIds);
    const rows = (profileRows ?? []).filter((row) => allowed.has(row.user_id as string));
    const profiles: TeamChildProfile[] = rows.map((row) => ({ id: row.id as string, name: (row.name as string) ?? "", authorId: row.user_id as string }));
    const merged = mergeTeamChildren({
      profiles,
      centreChildren: (centreRows ?? []).map((row) => ({ id: row.id as string, name: row.name as string })) as CentreChildRow[],
      links: (linkRows ?? []).map((row) => ({ childProfileId: row.child_profile_id as string, centreChildId: row.centre_child_id as string })) as CentreChildLinkRow[],
    });
    const details: TeamChildren["details"] = {};
    for (const row of rows) details[row.id as string] = { ageGroup: (row.age_group as string | null) ?? null, interests: asStrings(row.interests) };
    return { ...merged, profiles, details };
  } catch (error) {
    console.error("Team children failed:", error instanceof Error ? error.message : "unknown");
    return empty;
  }
}

/** The leader says these profiles are one child: they go on the centre's list as one. */
export async function linkTeamChildren(viewerId: string, profileIds: unknown): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const ids = Array.isArray(profileIds) ? [...new Set(profileIds.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))] : [];
  const ctx = await getTeamContext(viewerId);
  if (ctx.access.kind !== "team" || !ctx.centre || !ctx.scope) return { ok: false, status: 403, error: "Only your centre's leaders can do that." };
  const team = await loadTeamChildren(ctx);
  const linked = new Set(Object.entries(team.keyOfProfile).filter(([, key]) => key.startsWith("c:")).map(([id]) => id));
  if (!canLinkProfiles({ scope: ctx.scope, profileIds: ids, profiles: team.profiles, linkedProfileIds: linked })) {
    return { ok: false, status: 400, error: "Those children cannot be joined." };
  }
  const first = team.profiles.find((profile) => profile.id === ids[0]);
  const name = cleanCentreChildName(first?.name) ?? "Child";
  const admin = createAdminSupabase();
  const { data: child, error } = await admin
    .from("centre_children")
    .insert({ centre_id: ctx.centre.id, name, created_by: viewerId })
    .select("id")
    .single();
  if (error || !child) return { ok: false, status: 500, error: "That did not save. Try again." };
  const { error: linkError } = await admin.from("centre_child_links").insert(
    ids.map((id) => ({ child_profile_id: id, centre_child_id: child.id, centre_id: ctx.centre!.id, linked_by: viewerId })),
  );
  if (linkError) {
    await admin.from("centre_children").delete().eq("id", child.id);
    return { ok: false, status: 409, error: "One of those children is already joined. Reload and try again." };
  }
  await recordServerEvent(admin, { event: "centre_children_joined", userId: viewerId, path: "/evidence", metadata: { centre_id: ctx.centre.id, profiles: ids.length } });
  return { ok: true };
}

/** Undo a join: the centre child goes, every educator's own profile stays as it was. */
export async function splitTeamChild(viewerId: string, centreChildId: unknown): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (typeof centreChildId !== "string" || !/^[0-9a-f-]{36}$/i.test(centreChildId)) return { ok: false, status: 400, error: "That child cannot be split." };
  const ctx = await getTeamContext(viewerId);
  if (ctx.access.kind !== "team" || !ctx.centre) return { ok: false, status: 403, error: "Only your centre's leaders can do that." };
  const admin = createAdminSupabase();
  const { data, error } = await admin.from("centre_children").delete().eq("id", centreChildId).eq("centre_id", ctx.centre.id).select("id");
  if (error) return { ok: false, status: 500, error: "That did not save. Try again." };
  if (!data?.length) return { ok: false, status: 404, error: "That child is not on your centre's list." };
  return { ok: true };
}

/** The sample team on or off, for a leader of this centre. */
export async function setSampleTeam(viewerId: string, on: boolean): Promise<{ ok: true; show: boolean } | { ok: false; status: number; error: string }> {
  const ctx = await getTeamContext(viewerId);
  if (!ctx.isLeader || !ctx.centre) return { ok: false, status: 403, error: "Only your centre's leaders can do that." };
  if (on && ctx.otherMembers > 0) return { ok: false, status: 409, error: "Your team is already here, so there is no need for the sample." };
  const admin = createAdminSupabase();
  const { error } = await admin.from("centres").update({ sample_team_at: on ? new Date().toISOString() : null }).eq("id", ctx.centre.id);
  if (error) return { ok: false, status: 500, error: "That did not save. Try again." };
  await recordServerEvent(admin, { event: "centre_sample_team", userId: viewerId, path: "/team", metadata: { centre_id: ctx.centre.id, on } });
  return { ok: true, show: on };
}

// ------------------------------------------------- team evidence and radar

export type TeamEvidence = {
  children: Array<{ id: string; name: string }>;
  stories: EvidenceStory[];
  suggestions: Array<{ name: string; profileIds: string[]; authors: number }>;
  /** Children the leader has joined across lists, so she can undo one. */
  joined: Array<{ centreChildId: string; name: string; lists: number }>;
  /** Stories private members saved in the period: a total, never a story. */
  privateStories: number;
};

/** The team's stories and children since a date, each child counted once. */
export async function loadTeamEvidence(ctx: TeamContext, periodStartIso: string, localDay: (instant: string) => string | null): Promise<TeamEvidence> {
  const empty: TeamEvidence = { children: [], stories: [], suggestions: [], joined: [], privateStories: 0 };
  const scope = ctx.scope;
  if (!scope) return empty;
  try {
    const [team, { data: rows }, privateStories] = await Promise.all([
      loadTeamChildren(ctx),
      createAdminSupabase()
        .from("stories")
        .select("id, user_id, child_id, created_at, outcomes, next_steps, metadata")
        .in("user_id", scope.authorIds)
        .gte("created_at", periodStartIso)
        .order("created_at", { ascending: false })
        .limit(5000),
      countPrivateStories(ctx, periodStartIso),
    ]);
    const allowed = new Set(scope.authorIds);
    const stories = (rows ?? [])
      .filter((row) => allowed.has(row.user_id as string))
      .map((row) => {
        const story = evidenceStoryFromRow(row, localDay);
        return { ...story, childId: story.childId ? team.keyOfProfile[story.childId] ?? null : null };
      });
    return {
      children: team.children.map((child) => ({ id: child.key, name: child.name })),
      stories,
      suggestions: team.suggestions,
      joined: team.children.filter((child) => child.centreChildId && child.profileIds.length > 1).map((child) => ({ centreChildId: child.centreChildId!, name: child.name, lists: child.profileIds.length })),
      privateStories,
    };
  } catch (error) {
    console.error("Team evidence failed:", error instanceof Error ? error.message : "unknown");
    return empty;
  }
}

/** Moments (stories and Today Loop captures) for the team's quiet-child radar, keyed by team child. */
export async function loadTeamRadarInput(ctx: TeamContext, sinceIso: string): Promise<{ children: Array<{ id: string; name: string }>; moments: Array<{ childId: string | null; createdAt: string }> }> {
  const scope = ctx.scope;
  if (!scope) return { children: [], moments: [] };
  try {
    const admin = createAdminSupabase();
    const [team, storiesRes, capturesRes] = await Promise.all([
      loadTeamChildren(ctx),
      admin.from("stories").select("user_id, child_id, created_at").in("user_id", scope.authorIds).gte("created_at", sinceIso).limit(5000),
      admin.from("daily_captures").select("user_id, child_id, observed_at").in("user_id", scope.authorIds).gte("observed_at", sinceIso).limit(5000),
    ]);
    const allowed = new Set(scope.authorIds);
    const key = (childId: unknown) => (typeof childId === "string" ? team.keyOfProfile[childId] ?? null : null);
    return {
      children: team.children.map((child) => ({ id: child.key, name: child.name })),
      moments: [
        ...(storiesRes.data ?? []).filter((row) => allowed.has(row.user_id as string)).map((row) => ({ childId: key(row.child_id), createdAt: row.created_at as string })),
        ...(capturesRes.data ?? []).filter((row) => allowed.has(row.user_id as string)).map((row) => ({ childId: key(row.child_id), createdAt: row.observed_at as string })),
      ],
    };
  } catch (error) {
    console.error("Team radar failed:", error instanceof Error ? error.message : "unknown");
    return { children: [], moments: [] };
  }
}
