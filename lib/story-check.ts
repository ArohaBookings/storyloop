/**
 * Leader check (10 Nov 2026): an educator sends one story to their head
 * teacher, educational leader or mentor to check before families see it.
 *
 * Why it exists. Every paying account is a teacher on a personal email, and no
 * centre has ever been created: leaders never see StoryLoop. Checking a story
 * is something leaders already do, so this puts the note and the story in
 * front of the person who decides for the centre, with nothing to sign up for.
 *
 * The rules, all of them here so they can be tested without a database:
 *  - The link is the key. It is random, shown once, stored only as a hash,
 *    lasts 14 days, and the educator can cancel it.
 *  - It opens one story. Nothing else of the educator's is reachable from it.
 *  - The leader sees what the educator wrote and what StoryLoop drafted, the
 *    child's first name as it is in the story, and the educator's first name.
 *    Never an email address, a surname or an account id.
 *  - A check is answered once. A second answer does not overwrite the first.
 *
 * This file is safe to import in the browser. Making and hashing a link key
 * needs Node's crypto and lives in lib/story-check-token.ts.
 */
export const CHECK_DAYS = 14;
export const CHECK_NAME_MAX = 40;
export const CHECK_COMMENT_MAX = 600;

export type CheckStatus = "sent" | "opened" | "approved" | "changes";
export type CheckDecision = "approved" | "changes";

export type CheckRow = {
  id: string;
  story_id: string;
  user_id: string;
  status: CheckStatus;
  leader_name: string | null;
  comment: string | null;
  created_at: string;
  opened_at: string | null;
  decided_at: string | null;
  expires_at: string;
  revoked_at: string | null;
};

/** Link keys are 32 URL-safe characters. Anything else is not looked up at all. */
export function looksLikeCheckToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
}

export function checkExpiry(now = new Date()) {
  return new Date(now.getTime() + CHECK_DAYS * 24 * 60 * 60 * 1000);
}

export type CheckState = "open" | "answered" | "expired" | "cancelled";

/** Where a check stands. Cancelled wins over everything; an answer outlives the expiry. */
export function checkState(row: Pick<CheckRow, "status" | "expires_at" | "revoked_at">, now = new Date()): CheckState {
  if (row.revoked_at) return "cancelled";
  if (row.status === "approved" || row.status === "changes") return "answered";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "open";
}

/** The story may be read through the link while it is open, or after the leader has answered (so they can see what they said). */
export function canReadThroughLink(row: Pick<CheckRow, "status" | "expires_at" | "revoked_at">, now = new Date()) {
  const state = checkState(row, now);
  if (state === "open") return true;
  // An answered check stays readable to the leader until the original expiry, never after.
  return state === "answered" && new Date(row.expires_at).getTime() > now.getTime();
}

export function canAnswer(row: Pick<CheckRow, "status" | "expires_at" | "revoked_at">, now = new Date()) {
  return checkState(row, now) === "open";
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const LONG_NUMBER = /\d[\d\s-]{6,}\d/g;

/** A first name for the leader: letters, spaces, hyphens and apostrophes only. */
export function cleanLeaderName(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(EMAIL, "")
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHECK_NAME_MAX);
}

/** The leader's note to the educator: plain text, no email addresses or phone numbers, capped. */
export function cleanCheckComment(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(EMAIL, "[email]")
    .replace(LONG_NUMBER, "[number]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CHECK_COMMENT_MAX);
}

export function cleanDecision(raw: unknown): CheckDecision | null {
  return raw === "approved" || raw === "changes" ? raw : null;
}

/** "Sam" from "Sam Taylor", "sam.taylor@x" or nothing at all. Never a surname, never an address. */
export function educatorFirstName(fullName: string | null | undefined) {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return "An educator";
  return first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30) || "An educator";
}

type StoryForLeader = {
  child_name: string | null;
  observations: string | null;
  story_text: string;
  outcomes: string[] | null;
  next_steps: string[] | null;
  created_at: string | null;
};

/**
 * Exactly what the leader's page receives. Built field by field so that adding
 * a column to stories or profiles can never leak it through the link.
 */
export function leaderView(input: { story: StoryForLeader; check: CheckRow; educatorName: string | null | undefined; now?: Date }) {
  const { story, check } = input;
  const now = input.now ?? new Date();
  return {
    state: checkState(check, now),
    educator: educatorFirstName(input.educatorName),
    childName: (story.child_name ?? "").trim().split(/\s+/)[0] ?? "",
    note: story.observations ?? "",
    story: story.story_text,
    outcomes: (story.outcomes ?? []).slice(0, 12),
    nextSteps: (story.next_steps ?? []).slice(0, 8),
    writtenOn: story.created_at,
    expiresAt: check.expires_at,
    decision: check.status === "approved" || check.status === "changes" ? check.status : null,
    leaderName: check.leader_name ?? "",
    comment: check.comment ?? "",
  };
}

export type LeaderView = ReturnType<typeof leaderView>;

/** What the educator sees on their own story. */
export function educatorView(check: CheckRow | null, now = new Date()) {
  if (!check) return { state: "none" as const };
  return {
    state: checkState(check, now),
    opened: Boolean(check.opened_at),
    decision: check.status === "approved" || check.status === "changes" ? check.status : null,
    leaderName: check.leader_name ?? "",
    comment: check.comment ?? "",
    sentAt: check.created_at,
    decidedAt: check.decided_at,
    expiresAt: check.expires_at,
  };
}

export type EducatorCheckView = ReturnType<typeof educatorView>;

/**
 * The link the educator sends. The key sits after the #, which browsers never
 * send to a server: it stays out of request logs, analytics and referrers.
 */
export function checkUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/check#${token}`;
}

/** The key from a link's # part, or "" when there is none or it is not a key. */
export function tokenFromHash(hash: string) {
  const value = hash.replace(/^#/, "").trim();
  return looksLikeCheckToken(value) ? value : "";
}
