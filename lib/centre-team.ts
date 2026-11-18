import {
  canManageTeam,
  canReadActivity,
  canReadStoryContent,
  liveCentrePlan,
  type CentreOwnerBilling,
  type CentrePlanKey,
  type Membership,
} from "@/lib/centres";

/**
 * What a centre's leader may see of her team (18 Nov 2026).
 *
 * Until now every centre tool read only the signed-in educator's own stories,
 * so a leader on a centre plan saw activity counts and nothing else. This file
 * decides, with no database and no clock, exactly whose stories each team view
 * may read. lib/centre-team-server.ts gathers the facts and does what this
 * file says; the tests in tests/centre-team.test.ts try to get around it.
 *
 * The rules, on top of lib/centres.ts (whose consent rule is unchanged):
 *
 *   A LEADER, ON A LIVE PLAN. Team views are for an owner or admin of a centre
 *   whose owner holds a live centre plan. When the plan lapses, the team views
 *   close with it, and every educator keeps her own view as it always was.
 *
 *   CONTENT ONLY WITH CONSENT. A member who has not switched sharing on is a
 *   count (how many stories she wrote), never a story, a note or a child's name.
 *   Every id handed in is checked again here with canReadStoryContent, so a
 *   wrong query cannot widen what a leader reads.
 */

export type TeamAccess =
  | { kind: "team"; centreId: string; plan: CentrePlanKey }
  | { kind: "lapsed"; centreId: string }
  | { kind: "not_leader"; centreId: string }
  | { kind: "none" };

/** Whether the viewer may open her team's views today, and if not, why not. */
export function teamAccess(input: {
  viewerId: string;
  viewer: Membership | null;
  owner: CentreOwnerBilling | null | undefined;
}): TeamAccess {
  const { viewer } = input;
  if (!input.viewerId || !viewer || viewer.status !== "active" || viewer.userId !== input.viewerId || !viewer.centreId) {
    return { kind: "none" };
  }
  if (!canManageTeam(viewer)) return { kind: "not_leader", centreId: viewer.centreId };
  const plan = liveCentrePlan(input.owner);
  if (!plan) return { kind: "lapsed", centreId: viewer.centreId };
  return { kind: "team", centreId: viewer.centreId, plan };
}

export type TeamScope = {
  centreId: string;
  /** The viewer and every member whose stories she may read: evidence, planning and the radar. */
  authorIds: string[];
  /** Members other than the viewer whose shared stories are in her review queue. */
  reviewAuthorIds: string[];
  /** Active members who keep their stories private: counted, never read. */
  privateMemberIds: string[];
  /** Active members other than the viewer. */
  otherMembers: number;
};

/**
 * Whose stories the team views may read, from the consent-checked list
 * (lib/centres.ts listReadableAuthorIds) and the centre's active members.
 * Null unless the viewer has team access. Ids that do not survive the
 * re-check are dropped, never trusted.
 */
export function decideTeamScope(input: {
  viewerId: string;
  viewer: Membership | null;
  access: TeamAccess;
  readableIds: readonly string[];
  members: readonly Membership[];
}): TeamScope | null {
  const { viewerId, viewer, access } = input;
  if (access.kind !== "team" || !viewer || viewer.userId !== viewerId || viewer.centreId !== access.centreId) return null;

  const active = new Map<string, Membership>();
  for (const member of input.members) {
    if (member.status !== "active" || member.centreId !== access.centreId || !member.userId) continue;
    active.set(member.userId, member);
  }

  const readable = new Set<string>([viewerId]);
  for (const id of input.readableIds) {
    if (id === viewerId) continue;
    const author = active.get(id);
    if (!author || author.sharesStories !== true) continue;
    if (canReadStoryContent(viewerId, id, viewer, author)) readable.add(id);
  }

  const privateMemberIds: string[] = [];
  let otherMembers = 0;
  for (const [id, member] of active) {
    if (id === viewerId) continue;
    otherMembers += 1;
    if (!readable.has(id) && canReadActivity(viewerId, id, viewer, member)) privateMemberIds.push(id);
  }

  const authorIds = [viewerId, ...[...readable].filter((id) => id !== viewerId).sort()];
  return {
    centreId: access.centreId,
    authorIds,
    reviewAuthorIds: authorIds.filter((id) => id !== viewerId),
    privateMemberIds: privateMemberIds.sort(),
    otherMembers,
  };
}

/**
 * May this viewer mark this story? Only a leader with team access, only a
 * story written by an active member of her own centre who shares, and never
 * her own (a review is for someone else's work).
 */
export function canReviewStory(input: {
  viewerId: string;
  viewer: Membership | null;
  access: TeamAccess;
  author: Membership | null;
  storyUserId: string | null | undefined;
}): boolean {
  const { viewerId, viewer, access, author } = input;
  if (access.kind !== "team" || !viewer || !author) return false;
  if (viewer.userId !== viewerId || viewer.centreId !== access.centreId) return false;
  if (!input.storyUserId || input.storyUserId !== author.userId || author.userId === viewerId) return false;
  if (author.status !== "active" || author.centreId !== access.centreId || author.sharesStories !== true) return false;
  return canReadStoryContent(viewerId, author.userId, viewer, author);
}

// ---------------------------------------------------------------- reviews

export type ReviewStatus = "looks_good" | "note";
export const REVIEW_NOTE_MAX = 400;

/** A leader's short note: trimmed, spaces tidied, at most 400 characters. Null when empty. */
export function cleanReviewNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tidy = raw
    .replace(/\r\n?/g, "\n")
    // No control characters other than a new line.
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!tidy) return null;
  return tidy.slice(0, REVIEW_NOTE_MAX).trim();
}

/** What a leader sent, or why it cannot be saved. "Looks good" carries no words. */
export function readReviewInput(raw: unknown): { status: ReviewStatus; note: string | null } | { error: string } {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (body.status === "looks_good") return { status: "looks_good", note: null };
  if (body.status === "note") {
    const note = cleanReviewNote(body.note);
    if (!note) return { error: "Write a short note first." };
    return { status: "note", note };
  }
  return { error: "Choose looks good or leave a note." };
}

// ------------------------------------------------- the centre's child list

export type TeamChildProfile = { id: string; name: string; authorId: string };
export type CentreChildRow = { id: string; name: string };
export type CentreChildLinkRow = { childProfileId: string; centreChildId: string };

export type TeamChild = {
  /** "c:<centre child id>" for a child on the centre's list, "p:<profile id>" otherwise. */
  key: string;
  name: string;
  profileIds: string[];
  centreChildId: string | null;
};

export type SameNameSuggestion = { name: string; profileIds: string[]; authors: number };

/** "mia" from "Mia", " MIA ", "Mīa" or "Mia Rose": how two lists may spell the same first name. */
export function normaliseChildName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}'-]/gu, "");
}

/** A first name for the centre's list: the first word, letters only, at most 40 characters. */
export function cleanCentreChildName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const first = raw.trim().split(/\s+/)[0] ?? "";
  const clean = first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 40);
  return clean || null;
}

/**
 * The team's children, each counted once. A profile linked to the centre's
 * list counts as that centre child; any other profile counts as itself.
 * Only the profiles handed in (those of readable authors) are ever shown: a
 * centre child whose every linked profile belongs to someone who does not
 * share does not appear at all. Same first names across two educators' lists
 * are only ever SUGGESTED as one child: the leader decides.
 */
export function mergeTeamChildren(input: {
  profiles: readonly TeamChildProfile[];
  centreChildren: readonly CentreChildRow[];
  links: readonly CentreChildLinkRow[];
}): { children: TeamChild[]; keyOfProfile: Record<string, string>; suggestions: SameNameSuggestion[] } {
  const centreChild = new Map(input.centreChildren.map((row) => [row.id, row]));
  const linkOf = new Map<string, string>();
  for (const link of input.links) {
    if (centreChild.has(link.centreChildId)) linkOf.set(link.childProfileId, link.centreChildId);
  }

  const children = new Map<string, TeamChild>();
  const keyOfProfile: Record<string, string> = {};
  const unlinked: TeamChildProfile[] = [];
  const seen = new Set<string>();
  for (const profile of input.profiles) {
    if (!profile.id || seen.has(profile.id)) continue;
    seen.add(profile.id);
    const linked = linkOf.get(profile.id);
    if (linked) {
      const key = `c:${linked}`;
      const existing = children.get(key);
      if (existing) existing.profileIds.push(profile.id);
      else children.set(key, { key, name: centreChild.get(linked)!.name, profileIds: [profile.id], centreChildId: linked });
      keyOfProfile[profile.id] = key;
    } else {
      const key = `p:${profile.id}`;
      children.set(key, { key, name: (profile.name ?? "").trim() || "Unnamed child", profileIds: [profile.id], centreChildId: null });
      keyOfProfile[profile.id] = key;
      unlinked.push(profile);
    }
  }

  const byName = new Map<string, TeamChildProfile[]>();
  for (const profile of unlinked) {
    const name = normaliseChildName(profile.name);
    if (!name) continue;
    byName.set(name, [...(byName.get(name) ?? []), profile]);
  }
  const suggestions: SameNameSuggestion[] = [];
  for (const group of byName.values()) {
    const authors = new Set(group.map((profile) => profile.authorId));
    if (group.length < 2 || authors.size < 2) continue;
    suggestions.push({
      name: cleanCentreChildName(group[0].name) ?? group[0].name,
      profileIds: group.map((profile) => profile.id).sort(),
      authors: authors.size,
    });
  }
  suggestions.sort((a, b) => a.name.localeCompare(b.name, "en"));

  return { children: [...children.values()], keyOfProfile, suggestions };
}

/**
 * May the leader put these profiles on the centre's list as one child? Every
 * profile must be one the team views can already read, none may already be on
 * the list, and it takes two or more.
 */
export function canLinkProfiles(input: {
  scope: TeamScope | null;
  profileIds: readonly string[];
  profiles: readonly TeamChildProfile[];
  linkedProfileIds: ReadonlySet<string>;
}): boolean {
  const { scope } = input;
  if (!scope) return false;
  const ids = [...new Set(input.profileIds)];
  if (ids.length < 2 || ids.length > 12) return false;
  const authors = new Set(scope.authorIds);
  const byId = new Map(input.profiles.map((profile) => [profile.id, profile]));
  return ids.every((id) => {
    const profile = byId.get(id);
    return Boolean(profile) && authors.has(profile!.authorId) && !input.linkedProfileIds.has(id);
  });
}

// ------------------------------------------------------- the planning brief

export type BriefStory = { id: string; userId: string; createdAt: string | null };

/**
 * Which recent stories the planning brief reads (at most 12, the most the
 * writer takes): newest first, taken in turn from each author so one prolific
 * educator does not fill the brief. Only authors the scope allows.
 */
export function pickBriefStories<T extends BriefStory>(stories: readonly T[], allowedAuthorIds: readonly string[], max = 12): T[] {
  const allowed = new Set(allowedAuthorIds);
  const newestFirst = stories
    .filter((story) => allowed.has(story.userId))
    .slice()
    .sort((a, b) => Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "") || a.id.localeCompare(b.id));
  const queues = new Map<string, T[]>();
  for (const story of newestFirst) queues.set(story.userId, [...(queues.get(story.userId) ?? []), story]);
  // Authors in the order of their newest story.
  const order = [...queues.keys()];
  const picked: T[] = [];
  while (picked.length < max && order.some((author) => (queues.get(author)?.length ?? 0) > 0)) {
    for (const author of order) {
      const next = queues.get(author)?.shift();
      if (next) picked.push(next);
      if (picked.length >= max) break;
    }
  }
  return picked;
}

// ------------------------------------------------------- the sample team

/**
 * When the sample team is offered and when it shows. Offered to a leader with
 * nobody else in her centre and nobody invited. Once opened it shows until she
 * removes it, and it never shows beside a real team: the moment anyone joins,
 * it is gone from every view.
 */
export function sampleTeamState(input: {
  isLeader: boolean;
  sampleTeamAt: string | null | undefined;
  otherMembers: number;
  pendingInvites: number;
}): { offer: boolean; show: boolean } {
  if (!input.isLeader || input.otherMembers > 0) return { offer: false, show: false };
  const on = Boolean(input.sampleTeamAt);
  return { offer: !on && input.pendingInvites === 0, show: on };
}

// ------------------------------------------- which view a leader is looking at

export type TeamViewScope = "team" | "mine" | "sample";

/**
 * The views a page may offer. "mine" is the educator's own view, exactly as it
 * always was. "team" only for a leader with team access once anyone shares
 * with her; "sample" only while the sample team shows. Order is the order of
 * the switch on the page.
 */
export function teamViewScopes(input: { ownAccess: boolean; teamAccess: boolean; teamShares: boolean; sample: boolean }): TeamViewScope[] {
  const scopes: TeamViewScope[] = [];
  if (input.teamAccess && input.teamShares) scopes.push("team");
  if (input.ownAccess || input.teamAccess) scopes.push("mine");
  if (input.sample) scopes.push("sample");
  return scopes;
}

/** The asked-for view if it is on offer, else the first on offer (the team, when there is one). */
export function pickTeamViewScope(requested: unknown, available: readonly TeamViewScope[]): TeamViewScope | null {
  if (typeof requested === "string" && (available as readonly string[]).includes(requested)) return requested as TeamViewScope;
  return available[0] ?? null;
}
