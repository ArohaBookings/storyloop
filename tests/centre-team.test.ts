import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { Membership } from "../lib/centres";
import {
  canLinkProfiles,
  canReviewStory,
  cleanCentreChildName,
  cleanReviewNote,
  decideTeamScope,
  mergeTeamChildren,
  normaliseChildName,
  pickBriefStories,
  readReviewInput,
  REVIEW_NOTE_MAX,
  sampleTeamState,
  teamAccess,
  teamViewScopes,
  pickTeamViewScope,
  leaderTeamScopes,
  type TeamAccess,
} from "../lib/centre-team";
import { isSampleId, sampleCountryFor, sampleEvidence, sampleQueue, SAMPLE_CHILDREN, SAMPLE_EDUCATORS } from "../lib/sample-team";
import { buildEvidencePack, evidenceStoryFromRow } from "../lib/evidence-pack";
import { agoLabel, waitingCount, whenLabel } from "../lib/team-queue";

/**
 * Team views (18 Nov 2026). Every leader tool used to read only the leader's
 * own stories; these functions now decide whose stories a leader may read,
 * mark and count. Written as attempts to get at something: the usual answer
 * is no. Paths: leader, member with consent, member without, outsider, lapsed.
 */

const member = (over: Partial<Membership> & { userId: string }): Membership => ({
  centreId: "centre-a",
  role: "educator",
  status: "active",
  sharesStories: false,
  ...over,
});

const OWNER = member({ userId: "owner-a", role: "owner", sharesStories: true });
const ADMIN = member({ userId: "admin-a", role: "admin" });
const SHARER = member({ userId: "edu-share", sharesStories: true });
const PRIVATE = member({ userId: "edu-private" });
const REMOVED_SHARER = member({ userId: "edu-removed", sharesStories: true, status: "removed" });
const OUTSIDER = member({ userId: "edu-other", centreId: "centre-b", sharesStories: true });
const OTHER_OWNER = member({ userId: "owner-b", role: "owner", centreId: "centre-b", sharesStories: true });

const LIVE = { plan: "centre_starter", subscription_status: "trialing" };
const LAPSED = { plan: "free", subscription_status: "canceled" };
const TEAM: TeamAccess = { kind: "team", centreId: "centre-a", plan: "centre_starter" };
const MEMBERS = [OWNER, ADMIN, SHARER, PRIVATE];

// ------------------------------------------------------------------ access
test("a leader on a live centre plan gets the team views", () => {
  assert.deepEqual(teamAccess({ viewerId: "owner-a", viewer: OWNER, owner: LIVE }), TEAM);
  // An admin's access follows the owner's plan, not her own.
  assert.deepEqual(teamAccess({ viewerId: "admin-a", viewer: ADMIN, owner: LIVE }), TEAM);
  assert.equal(teamAccess({ viewerId: "owner-a", viewer: OWNER, owner: { plan: "centre_growth", subscription_status: "past_due" } }).kind, "team");
});

test("a lapsed plan closes the team views for every leader", () => {
  assert.deepEqual(teamAccess({ viewerId: "owner-a", viewer: OWNER, owner: LAPSED }), { kind: "lapsed", centreId: "centre-a" });
  assert.equal(teamAccess({ viewerId: "admin-a", viewer: ADMIN, owner: null }).kind, "lapsed");
  // An individual plan is not a centre plan, however live.
  assert.equal(teamAccess({ viewerId: "owner-a", viewer: OWNER, owner: { plan: "educator_pro", subscription_status: "active" } }).kind, "lapsed");
  assert.equal(teamAccess({ viewerId: "owner-a", viewer: OWNER, owner: { plan: "centre_starter", subscription_status: "canceled" } }).kind, "lapsed");
});

test("an educator, however much she shares, is never a leader", () => {
  assert.deepEqual(teamAccess({ viewerId: "edu-share", viewer: SHARER, owner: LIVE }), { kind: "not_leader", centreId: "centre-a" });
  assert.equal(teamAccess({ viewerId: "edu-private", viewer: PRIVATE, owner: LIVE }).kind, "not_leader");
});

test("no membership, a removed one, or somebody else's is no access", () => {
  assert.deepEqual(teamAccess({ viewerId: "solo", viewer: null, owner: LIVE }), { kind: "none" });
  assert.deepEqual(teamAccess({ viewerId: "edu-removed", viewer: REMOVED_SHARER, owner: LIVE }), { kind: "none" });
  assert.equal(teamAccess({ viewerId: "admin-a", viewer: { ...ADMIN, status: "removed" }, owner: LIVE }).kind, "none");
  // Somebody else's membership presented as yours.
  assert.deepEqual(teamAccess({ viewerId: "intruder", viewer: OWNER, owner: LIVE }), { kind: "none" });
  assert.deepEqual(teamAccess({ viewerId: "", viewer: OWNER, owner: LIVE }), { kind: "none" });
});

// ------------------------------------------------------------------- scope
test("the leader reads herself and members who share; a private member is a count", () => {
  const scope = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["owner-a", "edu-share"], members: MEMBERS })!;
  assert.deepEqual(scope.authorIds, ["owner-a", "edu-share"]);
  assert.deepEqual(scope.reviewAuthorIds, ["edu-share"]);
  assert.deepEqual(scope.privateMemberIds, ["admin-a", "edu-private"].sort());
  assert.equal(scope.otherMembers, 3);
});

test("a member without consent never enters the scope, even if a query says so", () => {
  // listReadableAuthorIds is consent-checked; this proves a wrong list cannot widen the scope.
  const scope = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["edu-private", "edu-share", "edu-share"], members: MEMBERS })!;
  assert.equal(scope.authorIds.includes("edu-private"), false);
  assert.equal(scope.reviewAuthorIds.includes("edu-private"), false);
  assert.equal(scope.privateMemberIds.includes("edu-private"), true);
  assert.equal(scope.authorIds.filter((id) => id === "edu-share").length, 1);
});

test("an outsider, a removed member or a stranger in the list is dropped", () => {
  const scope = decideTeamScope({
    viewerId: "owner-a",
    viewer: OWNER,
    access: TEAM,
    readableIds: ["edu-other", "owner-b", "edu-removed", "stranger", "edu-share"],
    members: [...MEMBERS, OUTSIDER, OTHER_OWNER, REMOVED_SHARER],
  })!;
  assert.deepEqual(scope.authorIds, ["owner-a", "edu-share"]);
  assert.equal(scope.privateMemberIds.includes("edu-other"), false, "another centre's member is not even counted");
  assert.equal(scope.privateMemberIds.includes("edu-removed"), false);
  assert.equal(scope.otherMembers, 3);
});

test("no scope at all without team access", () => {
  for (const access of [{ kind: "lapsed", centreId: "centre-a" }, { kind: "not_leader", centreId: "centre-a" }, { kind: "none" }] as TeamAccess[]) {
    assert.equal(decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access, readableIds: ["edu-share"], members: MEMBERS }), null);
  }
  // Team access for another centre does not open this one.
  assert.equal(decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: { kind: "team", centreId: "centre-b", plan: "centre_starter" }, readableIds: ["edu-share"], members: MEMBERS }), null);
  // A viewer who is not who she says.
  assert.equal(decideTeamScope({ viewerId: "edu-share", viewer: OWNER, access: TEAM, readableIds: ["edu-share"], members: MEMBERS }), null);
});

test("an admin reads the owner's stories only because the owner shares", () => {
  const sharing = decideTeamScope({ viewerId: "admin-a", viewer: ADMIN, access: TEAM, readableIds: ["admin-a", "owner-a", "edu-share"], members: MEMBERS })!;
  assert.deepEqual(sharing.reviewAuthorIds, ["edu-share", "owner-a"].sort());
  const ownerPrivate = [{ ...OWNER, sharesStories: false }, ADMIN, SHARER, PRIVATE];
  const notSharing = decideTeamScope({ viewerId: "admin-a", viewer: ADMIN, access: TEAM, readableIds: ["owner-a", "edu-share"], members: ownerPrivate })!;
  assert.equal(notSharing.reviewAuthorIds.includes("owner-a"), false);
  assert.equal(notSharing.privateMemberIds.includes("owner-a"), true);
});

// ------------------------------------------------------------------ review
test("a leader may mark a sharing member's story", () => {
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: SHARER, storyUserId: "edu-share" }), true);
  assert.equal(canReviewStory({ viewerId: "admin-a", viewer: ADMIN, access: TEAM, author: SHARER, storyUserId: "edu-share" }), true);
});

test("no mark on a member without consent, an outsider, a removed member or her own story", () => {
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: PRIVATE, storyUserId: "edu-private" }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: OUTSIDER, storyUserId: "edu-other" }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: REMOVED_SHARER, storyUserId: "edu-removed" }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: OWNER, storyUserId: "owner-a" }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: null, storyUserId: "edu-share" }), false);
});

test("no mark when the story is not the author's, or without team access", () => {
  // A sharing member's membership paired with someone else's story.
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: SHARER, storyUserId: "edu-private" }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: TEAM, author: SHARER, storyUserId: null }), false);
  assert.equal(canReviewStory({ viewerId: "owner-a", viewer: OWNER, access: { kind: "lapsed", centreId: "centre-a" }, author: SHARER, storyUserId: "edu-share" }), false);
  assert.equal(canReviewStory({ viewerId: "edu-share", viewer: SHARER, access: { kind: "not_leader", centreId: "centre-a" }, author: SHARER, storyUserId: "edu-share" }), false);
  // An educator handed team access by mistake still cannot read a colleague.
  assert.equal(canReviewStory({ viewerId: "edu-private", viewer: PRIVATE, access: TEAM, author: SHARER, storyUserId: "edu-share" }), false);
  // A leader of another centre.
  assert.equal(canReviewStory({ viewerId: "owner-b", viewer: OTHER_OWNER, access: { kind: "team", centreId: "centre-b", plan: "centre_starter" }, author: SHARER, storyUserId: "edu-share" }), false);
});

test("a note is short, tidy and never empty; looks good carries no words", () => {
  assert.deepEqual(readReviewInput({ status: "looks_good", note: "hidden words" }), { status: "looks_good", note: null });
  assert.deepEqual(readReviewInput({ status: "note", note: "  Lovely   detail.\r\n\r\n\r\nTry the next step?  " }), { status: "note", note: "Lovely detail.\n\nTry the next step?" });
  assert.ok("error" in readReviewInput({ status: "note", note: "   " }));
  assert.ok("error" in readReviewInput({ status: "approved" }));
  assert.ok("error" in readReviewInput(null));
  assert.equal(cleanReviewNote("x".repeat(REVIEW_NOTE_MAX + 50))!.length, REVIEW_NOTE_MAX);
  assert.equal(cleanReviewNote("a\u0000b\u0007c"), "a b c");
  assert.equal(cleanReviewNote(42), null);
});

// --------------------------------------------------------- the child list
const PROFILES = [
  { id: "p-mia-share", name: "Mia", authorId: "edu-share" },
  { id: "p-mia-owner", name: "mia", authorId: "owner-a" },
  { id: "p-theo", name: "Theo", authorId: "edu-share" },
  { id: "p-ana-1", name: "Ana", authorId: "edu-share" },
  { id: "p-ana-2", name: "Ana", authorId: "edu-share" },
];

test("the same child in two educators' lists is suggested, never merged on its own", () => {
  const merged = mergeTeamChildren({ profiles: PROFILES, centreChildren: [], links: [] });
  assert.equal(merged.children.length, 5);
  assert.deepEqual(merged.suggestions, [{ name: "Mia", profileIds: ["p-mia-owner", "p-mia-share"], authors: 2 }]);
  // Two "Ana"s in one educator's own list are her business, not a suggestion.
  assert.equal(merged.suggestions.some((s) => s.name === "Ana"), false);
});

test("once on the centre's list, a child is counted once", () => {
  const merged = mergeTeamChildren({
    profiles: PROFILES,
    centreChildren: [{ id: "cc-mia", name: "Mia" }],
    links: [{ childProfileId: "p-mia-share", centreChildId: "cc-mia" }, { childProfileId: "p-mia-owner", centreChildId: "cc-mia" }],
  });
  const mia = merged.children.filter((child) => normaliseChildName(child.name) === "mia");
  assert.equal(mia.length, 1);
  assert.deepEqual(mia[0].profileIds.sort(), ["p-mia-owner", "p-mia-share"]);
  assert.equal(merged.keyOfProfile["p-mia-share"], merged.keyOfProfile["p-mia-owner"]);
  assert.equal(merged.suggestions.length, 0);
});

test("a centre child seen only through a private member's list never appears", () => {
  // The private member's profile is not handed in (it is not readable), so her linked child stays hidden.
  const merged = mergeTeamChildren({
    profiles: PROFILES.filter((profile) => profile.authorId !== "edu-private"),
    centreChildren: [{ id: "cc-hidden", name: "Wiremu" }],
    links: [{ childProfileId: "p-private-wiremu", centreChildId: "cc-hidden" }],
  });
  assert.equal(merged.children.some((child) => child.name === "Wiremu"), false);
  // A link to another centre's child (not in this centre's list) is ignored.
  const foreign = mergeTeamChildren({ profiles: PROFILES, centreChildren: [], links: [{ childProfileId: "p-theo", centreChildId: "cc-foreign" }] });
  assert.equal(foreign.keyOfProfile["p-theo"], "p:p-theo");
});

test("only readable, unlinked profiles may be joined, two or more", () => {
  const scope = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["edu-share"], members: MEMBERS });
  const profiles = [...PROFILES, { id: "p-private", name: "Mia", authorId: "edu-private" }];
  const none = new Set<string>();
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share", "p-mia-owner"], profiles, linkedProfileIds: none }), true);
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share", "p-private"], profiles, linkedProfileIds: none }), false, "a private member's child");
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share"], profiles, linkedProfileIds: none }), false, "one is not a pair");
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share", "p-mia-share"], profiles, linkedProfileIds: none }), false, "the same twice");
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share", "p-unknown"], profiles, linkedProfileIds: none }), false);
  assert.equal(canLinkProfiles({ scope, profileIds: ["p-mia-share", "p-mia-owner"], profiles, linkedProfileIds: new Set(["p-mia-owner"]) }), false, "already joined");
  assert.equal(canLinkProfiles({ scope: null, profileIds: ["p-mia-share", "p-mia-owner"], profiles, linkedProfileIds: none }), false, "lapsed or not a leader");
});

test("child names are compared by first name, and stored as one", () => {
  assert.equal(normaliseChildName("  Mīa Rose "), "mia");
  assert.equal(normaliseChildName("MIA"), "mia");
  assert.equal(normaliseChildName(""), "");
  assert.equal(cleanCentreChildName("Mia Rose-Smith"), "Mia");
  assert.equal(cleanCentreChildName("  Te Aroha "), "Te");
  assert.equal(cleanCentreChildName("<script>"), "script");
  assert.equal(cleanCentreChildName(""), null);
});

// ---------------------------------------------------------- planning brief
test("the brief reads only allowed authors, newest first, each in turn", () => {
  const stories = [
    { id: "s1", userId: "edu-share", createdAt: "2026-11-17T10:00:00Z" },
    { id: "s2", userId: "edu-share", createdAt: "2026-11-16T10:00:00Z" },
    { id: "s3", userId: "edu-share", createdAt: "2026-11-15T10:00:00Z" },
    { id: "s4", userId: "owner-a", createdAt: "2026-11-10T10:00:00Z" },
    { id: "secret", userId: "edu-private", createdAt: "2026-11-18T10:00:00Z" },
  ];
  const picked = pickBriefStories(stories, ["owner-a", "edu-share"], 3);
  assert.deepEqual(picked.map((story) => story.id), ["s1", "s4", "s2"]);
  assert.equal(pickBriefStories(stories, ["owner-a", "edu-share"]).some((story) => story.userId === "edu-private"), false);
  assert.equal(pickBriefStories(stories, [], 12).length, 0);
  assert.equal(pickBriefStories(Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, userId: "edu-share", createdAt: null })), ["edu-share"]).length, 12);
});

// -------------------------------------------------------------- the sample
test("the sample team is offered to a leader with nobody else, and never beside a real team", () => {
  assert.deepEqual(sampleTeamState({ isLeader: true, sampleTeamAt: null, otherMembers: 0, pendingInvites: 0 }), { offer: true, show: false });
  assert.deepEqual(sampleTeamState({ isLeader: true, sampleTeamAt: null, otherMembers: 0, pendingInvites: 2 }), { offer: false, show: false });
  assert.deepEqual(sampleTeamState({ isLeader: true, sampleTeamAt: "2026-11-18T00:00:00Z", otherMembers: 0, pendingInvites: 1 }), { offer: false, show: true });
  assert.deepEqual(sampleTeamState({ isLeader: true, sampleTeamAt: "2026-11-18T00:00:00Z", otherMembers: 1, pendingInvites: 0 }), { offer: false, show: false });
  assert.deepEqual(sampleTeamState({ isLeader: false, sampleTeamAt: "2026-11-18T00:00:00Z", otherMembers: 0, pendingInvites: 0 }), { offer: false, show: false });
});

test("the sample is invented, labelled by id, and never a record a route would accept", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const now = new Date("2026-11-18T09:00:00Z");
  const queue = sampleQueue(now);
  assert.ok(queue.length >= 4);
  for (const item of queue) {
    assert.ok(isSampleId(item.id) && !UUID.test(item.id), item.id);
  }
  for (const child of SAMPLE_CHILDREN) assert.ok(isSampleId(child.id));
  for (const educator of SAMPLE_EDUCATORS) assert.ok(isSampleId(educator.id));
  // Newest first, and one already answered so both states show.
  assert.deepEqual([...queue].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((i) => i.id), queue.map((i) => i.id));
  assert.equal(waitingCount(queue), queue.length - 1);
  // Only first names: no surname, no address.
  for (const item of queue) assert.ok(/^[A-Z][a-z]+$/.test(item.author) && /^[A-Z][a-z]+$/.test(item.childName ?? ""), `${item.author} ${item.childName}`);
});

test("every sample card says Example (release decision, 19 Nov 2026)", () => {
  const queue = readFileSync(new URL("../components/app/TeamReviewQueue.tsx", import.meta.url), "utf8");
  assert.match(queue, /\{sample && \(\s*<span[^>]*data-testid="sample-label">\s*Example\s*<\/span>/);
});

test("the sample team's evidence works and counts Mia once", () => {
  const now = new Date("2026-11-18T09:00:00Z");
  const { children, stories } = sampleEvidence(now);
  const pack = buildEvidencePack({ children, stories, periodLabel: "Sample", periodStart: "2026-08-20", periodEnd: "2026-11-18" });
  assert.equal(pack.childCount, SAMPLE_CHILDREN.length);
  assert.equal(pack.coverage.filter((row) => row.name === "Mia").length, 1);
  assert.equal(pack.coverage.find((row) => row.name === "Mia")!.stories, 2);
  assert.ok(pack.gaps.some((gap) => gap.includes("Sione")), "a child with no story shows as a gap");
});

test("dates read the way a leader says them", () => {
  const now = new Date("2026-11-18T09:00:00Z");
  assert.equal(agoLabel("2026-11-18T08:00:00Z", now), "today");
  assert.equal(agoLabel("2026-11-17T08:00:00Z", now), "yesterday");
  assert.equal(agoLabel("2026-11-15T08:00:00Z", now), "3 days ago");
  assert.equal(whenLabel("2026-11-15T08:00:00Z", now), "3 days ago");
  assert.match(whenLabel("2026-11-02T08:00:00Z", now), /^on 2 Nov/);
  assert.equal(agoLabel("not a date", now), "");
});

test("the team view is offered only to a leader with sharing members; everyone else keeps their own", () => {
  assert.deepEqual(teamViewScopes({ ownAccess: true, teamAccess: false, teamShares: false, sample: false }), ["mine"]);
  assert.deepEqual(teamViewScopes({ ownAccess: true, teamAccess: true, teamShares: false, sample: false }), ["mine"]);
  assert.deepEqual(teamViewScopes({ ownAccess: true, teamAccess: true, teamShares: true, sample: false }), ["team", "mine"]);
  // A covered admin has no plan of her own but leads the team.
  assert.deepEqual(teamViewScopes({ ownAccess: false, teamAccess: true, teamShares: true, sample: false }), ["team", "mine"]);
  assert.deepEqual(teamViewScopes({ ownAccess: false, teamAccess: false, teamShares: true, sample: false }), []);
  assert.deepEqual(teamViewScopes({ ownAccess: false, teamAccess: false, teamShares: false, sample: true }), ["sample"]);
  assert.equal(pickTeamViewScope("team", ["team", "mine"]), "team");
  assert.equal(pickTeamViewScope("mine", ["team", "mine"]), "mine");
  assert.equal(pickTeamViewScope(undefined, ["team", "mine"]), "team");
  // Asking for the team view does not open it.
  assert.equal(pickTeamViewScope("team", ["mine"]), "mine");
  assert.equal(pickTeamViewScope("sample", ["mine"]), "mine");
  assert.equal(pickTeamViewScope("../../etc", []), null);
});

test("a saved story reads into the pack the same way for the team as for one educator", () => {
  const row = {
    id: "s-1",
    child_id: "p-mia",
    created_at: "2026-11-17T22:30:00Z",
    outcomes: ["Exploration", 3, "Communication"],
    next_steps: ["Generated step"],
    metadata: {
      storyTitle: " The long pipe ",
      learningSummary: "Tested water.",
      nextStepProgress: [{ text: "Longer pipes", status: "tried" }, { text: " ", status: "continue" }, { text: "Funnel", status: "weird" }],
      educatorReflection: "  I waited. ",
      whanauVoice: "",
      learningDispositions: ["Curiosity", null],
    },
  };
  const story = evidenceStoryFromRow(row, () => "2026-11-18");
  assert.deepEqual(story, {
    id: "s-1",
    childId: "p-mia",
    date: "2026-11-18",
    title: "The long pipe",
    summary: "Tested water.",
    outcomes: ["Exploration", "Communication"],
    dispositions: ["Curiosity"],
    nextSteps: [{ text: "Longer pipes", status: "tried" }, { text: "Funnel", status: "planned" }],
    reflection: "I waited.",
    familyVoice: null,
  });
  // No saved progress: the generated steps are the plan. No local day: the saved date.
  const plain = evidenceStoryFromRow({ ...row, metadata: null }, () => null);
  assert.deepEqual(plain.nextSteps, [{ text: "Generated step", status: "planned" }]);
  assert.equal(plain.date, "2026-11-17");
});

// ------------------------------------------------- every way in, in one table
test("every way in: leader, member with consent, member without, outsider, lapsed plan", () => {
  // What each person may do in centre A, decided end to end by the pure rules,
  // as the server runs them: access, then scope from the consent-checked list,
  // then each action. The list handed in is deliberately too wide.
  const everyone = [OWNER, ADMIN, SHARER, PRIVATE, OUTSIDER, OTHER_OWNER, REMOVED_SHARER];
  const tooWide = everyone.map((person) => person.userId);
  const profiles = [
    { id: "p-owner-mia", name: "Mia", authorId: "owner-a" },
    { id: "p-share-mia", name: "Mia", authorId: "edu-share" },
    { id: "p-private-mia", name: "Mia", authorId: "edu-private" },
  ];
  const cases: Array<{ who: string; viewer: Membership | null; owner: typeof LIVE | null; expect: { access: TeamAccess["kind"]; reads: string[]; marksSharer: boolean; marksPrivate: boolean; joins: boolean; switch: string[] } }> = [
    { who: "owner on a live plan", viewer: OWNER, owner: LIVE, expect: { access: "team", reads: ["owner-a", "edu-share"], marksSharer: true, marksPrivate: false, joins: true, switch: ["team", "mine"] } },
    { who: "admin on the owner's live plan", viewer: ADMIN, owner: LIVE, expect: { access: "team", reads: ["admin-a", "edu-share", "owner-a"], marksSharer: true, marksPrivate: false, joins: true, switch: ["team", "mine"] } },
    { who: "member with consent", viewer: SHARER, owner: LIVE, expect: { access: "not_leader", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "member without consent", viewer: PRIVATE, owner: LIVE, expect: { access: "not_leader", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "another centre's member", viewer: OUTSIDER, owner: LIVE, expect: { access: "not_leader", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "another centre's owner", viewer: OTHER_OWNER, owner: LIVE, expect: { access: "team", reads: ["owner-b", "edu-other"], marksSharer: false, marksPrivate: false, joins: false, switch: ["team", "mine"] } },
    { who: "a removed member", viewer: REMOVED_SHARER, owner: LIVE, expect: { access: "none", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "nobody's member", viewer: null, owner: LIVE, expect: { access: "none", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "owner on a lapsed plan", viewer: OWNER, owner: LAPSED, expect: { access: "lapsed", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
    { who: "admin on a lapsed plan", viewer: ADMIN, owner: LAPSED, expect: { access: "lapsed", reads: [], marksSharer: false, marksPrivate: false, joins: false, switch: [] } },
  ];
  for (const { who, viewer, owner, expect } of cases) {
    const viewerId = viewer?.userId ?? "solo";
    const access = teamAccess({ viewerId, viewer, owner });
    assert.equal(access.kind, expect.access, `${who}: access`);
    const members = everyone.filter((person) => viewer && person.centreId === viewer.centreId);
    const scope = decideTeamScope({ viewerId, viewer, access, readableIds: tooWide, members });
    assert.deepEqual([...(scope?.authorIds ?? [])].sort(), [...expect.reads].sort(), `${who}: whose stories the team views read`);
    assert.equal(scope?.authorIds.includes("edu-private") ?? false, false, `${who}: never the private member's stories`);
    const marks = (author: Membership) => canReviewStory({ viewerId, viewer, access, author, storyUserId: author.userId });
    assert.equal(marks(SHARER), expect.marksSharer, `${who}: may mark the sharing member's story`);
    assert.equal(marks(PRIVATE), expect.marksPrivate, `${who}: may mark the private member's story`);
    assert.equal(canLinkProfiles({ scope, profileIds: ["p-owner-mia", "p-share-mia"], profiles, linkedProfileIds: new Set() }), expect.joins, `${who}: may join two lists' Mia`);
    assert.equal(canLinkProfiles({ scope, profileIds: ["p-share-mia", "p-private-mia"], profiles, linkedProfileIds: new Set() }), false, `${who}: never joins a private member's child`);
    assert.deepEqual(leaderTeamScopes({ access, scope }), expect.switch, `${who}: whole team / just mine`);
  }
});

test("the whole team switch needs someone sharing, and a scope for the same centre", () => {
  const scope = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["owner-a"], members: [OWNER, PRIVATE] })!;
  assert.deepEqual(leaderTeamScopes({ access: TEAM, scope }), [], "nobody shares yet: her own view only");
  assert.deepEqual(leaderTeamScopes({ access: TEAM, scope: null }), []);
  const shared = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["edu-share"], members: MEMBERS })!;
  assert.deepEqual(leaderTeamScopes({ access: { kind: "team", centreId: "centre-b", plan: "centre_starter" }, scope: shared }), [], "a scope from another centre opens nothing");
  assert.deepEqual(leaderTeamScopes({ access: { kind: "lapsed", centreId: "centre-a" }, scope: shared }), []);
});

test("the sample speaks the leader's curriculum: the EYLF in Australia, Te Whāriki otherwise", () => {
  assert.equal(sampleCountryFor("AU"), "AU");
  for (const other of ["NZ", "UK", "IE", null, undefined, "", 7]) assert.equal(sampleCountryFor(other), "NZ");
  const now = new Date("2026-11-19T00:00:00Z");
  const nz = sampleQueue(now);
  const au = sampleQueue(now, "AU");
  assert.deepEqual(au.map((item) => item.id), nz.map((item) => item.id), "the same six moments, in the same order");
  const auText = JSON.stringify(au);
  assert.equal(/Mana |waiata/.test(auText), false, "no New Zealand strands or words in the Australian sample");
  assert.ok(au.every((item) => item.outcomes.length > 0 && item.outcomes.every((outcome) => /^Outcome [1-5]: Children /.test(outcome))));
  assert.ok(nz.every((item) => item.outcomes.every((outcome) => / \| Mana /.test(outcome))), "New Zealand unchanged");
  const pack = sampleEvidence(now, undefined, "AU");
  assert.equal(/Mana |waiata/.test(JSON.stringify(pack)), false);
  assert.deepEqual(pack.children, sampleEvidence(now).children, "the same invented children");
});

// ------------------------------------------------- review 1, R1-08: no reaching back
test("a leader reads a sharing member only from the day she joined this centre or switched sharing on, whichever is later", async () => {
  const { inTeamWindow, teamReadsFrom } = await import("../lib/centre-team");
  const joined = "2026-11-01T00:00:00.000Z";
  const switchedOn = "2026-11-10T00:00:00.000Z";
  assert.equal(teamReadsFrom({ joinedAt: joined, sharesStoriesSince: null }), joined);
  assert.equal(teamReadsFrom({ joinedAt: joined, sharesStoriesSince: switchedOn }), switchedOn);
  assert.equal(teamReadsFrom({ joinedAt: switchedOn, sharesStoriesSince: joined }), switchedOn);
  assert.equal(teamReadsFrom({ joinedAt: null, sharesStoriesSince: switchedOn }), "9999-12-31T00:00:00.000Z", "no join day known: nothing is read");

  // Kate: a year of stories at her old centre, joined this one on 1 Nov, switched sharing on 10 Nov.
  const kate = member({ userId: "edu-share", sharesStories: true, joinedAt: joined, sharesStoriesSince: switchedOn });
  const scope = decideTeamScope({ viewerId: "owner-a", viewer: OWNER, access: TEAM, readableIds: ["edu-share"], members: [OWNER, ADMIN, kate, PRIVATE] })!;
  assert.deepEqual(scope.readsFrom, { "edu-share": switchedOn });
  assert.equal(inTeamWindow(scope, "edu-share", "2025-12-01T09:00:00.000Z"), false, "a story from her old centre");
  assert.equal(inTeamWindow(scope, "edu-share", "2026-11-05T09:00:00.000Z"), false, "after joining, before she shared");
  assert.equal(inTeamWindow(scope, "edu-share", "2026-11-10T00:00:00.000Z"), true, "from the day she switched sharing on");
  assert.equal(inTeamWindow(scope, "edu-share", "2026-11-18T09:00:00.000Z"), true);
  assert.equal(inTeamWindow(scope, "owner-a", "2020-01-01T00:00:00.000Z"), true, "the leader's own stories have no floor");
  assert.equal(inTeamWindow(scope, "edu-private", "2026-11-18T09:00:00.000Z"), false, "a private member is never read");
  assert.equal(inTeamWindow(scope, "edu-share", null), false);
});

test("every team read and the leader's mark go through the date floor", () => {
  const server = readFileSync(new URL("../lib/centre-team-server.ts", import.meta.url), "utf8");
  for (const fn of ["loadTeamQueue", "loadTeamChildren", "loadTeamEvidence", "loadTeamRadarInput", "saveTeamReview"]) {
    const start = server.indexOf(`export async function ${fn}(`);
    const end = server.indexOf("\nexport ", start + 10);
    assert.ok(start > 0, fn);
    assert.match(server.slice(start, end > 0 ? end : undefined), /inTeamWindow\(/, `${fn} uses the floor`);
  }
  assert.match(server, /select\("centre_id, user_id, role, status, shares_stories, joined_at, shares_stories_since"\)/);
  const planning = readFileSync(new URL("../app/api/team-planning/route.ts", import.meta.url), "utf8");
  assert.match(planning, /inTeamWindow\(scope, story\.user_id, story\.created_at\)/);
  const sharing = readFileSync(new URL("../app/api/centres/sharing/route.ts", import.meta.url), "utf8");
  assert.match(sharing, /shares_stories: true, shares_stories_since: new Date\(\)\.toISOString\(\)/);
});

// ------------------------------------------------- review 2, R2-04: children from the names in shared stories
test("a leader's team counts the children named in shared stories, even with no saved profile", async () => {
  const { nameOnlyChildren, teamChildOfStory } = await import("../lib/centre-team");
  const saved = [{ id: "11111111-1111-4111-8111-111111111111", name: "Theo", authorId: "edu-share" }];
  const stories = [
    { user_id: "edu-share", child_id: null, child_name: "Mia" },
    { user_id: "edu-share", child_id: null, child_name: "mia" },
    { user_id: "edu-share", child_id: null, child_name: "Theo" },
    { user_id: "owner-a", child_id: null, child_name: "Mia" },
    { user_id: "edu-share", child_id: null, child_name: "" },
  ];
  const named = nameOnlyChildren(stories, saved);
  assert.deepEqual(named.profiles.map((p) => p.id).sort(), ["n:edu-share:mia", "n:owner-a:mia"], "one Mia per educator; Theo is her saved profile, not a second child");
  const merged = mergeTeamChildren({ profiles: [...saved, ...named.profiles], centreChildren: [], links: [] });
  assert.equal(merged.children.length, 3, "Theo, her Mia, the leader's Mia: never guessed into one");
  assert.equal(merged.suggestions.length, 0, "a name-only child is never offered for joining (nothing to link)");
  assert.equal(teamChildOfStory(stories[1], merged.keyOfProfile, named.byAuthorName), "p:n:edu-share:mia");
  assert.equal(teamChildOfStory(stories[2], merged.keyOfProfile, named.byAuthorName), `p:${saved[0].id}`);
  assert.equal(teamChildOfStory(stories[4], merged.keyOfProfile, named.byAuthorName), null);
});
