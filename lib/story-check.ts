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
 *
 * 13 Nov 2026, the centre offer: the educator may add her centre's name and
 * tick a box to show the leader a few numbers about her own recent stories.
 * The leader's page then offers the whole team's free month, with her already
 * attached through an offer reference that is not the link key and opens
 * nothing (lib/story-check-token.ts offerRefFor, lib/leader-offer-server.ts).
 */

export const CHECK_DAYS = 14;
export const CHECK_NAME_MAX = 40;
export const CHECK_COMMENT_MAX = 600;
/** The centre name the educator may add when she sends a story (13 Nov 2026). */
export const CENTRE_NAME_MAX = 80;
/** Fewer saved stories than this in the last 30 days, and the leader is shown no numbers at all. */
export const COUNTS_MIN_STORIES = 3;
/** After a check's own expiry, how long its centre offer can still pre-fill a centre's set-up. */
export const OFFER_GRACE_DAYS = 30;

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
  /** What the educator chose to send with the story (13 Nov 2026). Absent on rows read before the migration. */
  centre_name?: string | null;
  share_counts?: boolean | null;
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

/**
 * The centre's name as the educator typed it: plain words only. Addresses,
 * links and long numbers are dropped, because the leader's page shows it and
 * a centre's set-up screen is filled in from it.
 */
export function cleanCentreName(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(EMAIL, "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(LONG_NUMBER, "")
    .replace(/[^\p{L}\p{M}\p{N}&'’().,\- ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CENTRE_NAME_MAX)
    .trim();
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
 * The numbers an educator may choose to show her leader (13 Nov 2026), worked
 * out from her own saved stories when the leader's page opens. Exactly what
 * the box she ticks promises, "how many children I have written about lately
 * (numbers only, no names)", and nothing more: never a child's name, never a
 * comparison with anybody, never a score, never a count of who has had nothing.
 */
export type LeaderCounts = {
  /** Stories saved in the last 30 days. */
  stories30: number;
  /** About how many different children those stories are about, by the first name saved with each. */
  children30: number;
};

function firstNameKey(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0]?.toLocaleLowerCase("en-NZ") ?? "";
}

/**
 * The counts, or null when there is too little to say anything fair (fewer
 * than three stories in the last 30 days). Pure: the caller passes the stories
 * and now.
 */
export function leaderCounts(
  stories: Array<{ child_name: string | null; created_at: string }>,
  options: { now: Date },
): LeaderCounts | null {
  const since30 = options.now.getTime() - 30 * 86_400_000;
  const recent = stories.filter((story) => {
    const at = Date.parse(story.created_at);
    return Number.isFinite(at) && at > since30 && at <= options.now.getTime();
  });
  if (recent.length < COUNTS_MIN_STORIES) return null;
  const children30 = new Set(recent.map((story) => firstNameKey(story.child_name)).filter(Boolean)).size;
  return { stories30: recent.length, children30 };
}

/** The one sentence of numbers on the leader's page. Pure. */
export function leaderCountsSentence(educator: string, counts: LeaderCounts) {
  const stories = `${counts.stories30} ${counts.stories30 === 1 ? "story" : "stories"}`;
  const children = counts.children30 === 1 ? "1 child" : `${counts.children30} different children`;
  return `In the last 30 days ${educator} saved ${stories} about ${children}.`;
}

/** What the leader's page needs for the centre offer: never the link key, never anything about the account. */
export type LeaderOffer = {
  /** The educator's own referral code, so a centre that subscribes credits her (lib/referrals.ts). */
  code: string | null;
  /** The check's offer reference (lib/story-check-token.ts offerRefFor): not the link key, opens nothing. */
  ref: string | null;
  counts: LeaderCounts | null;
};

/** Offer references are 43 URL-safe characters (a SHA-256, base64url). Anything else is not looked up. */
export function looksLikeOfferRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/**
 * Where "Start our free month" goes: signup for the centre plan with the
 * educator's referral code, and the offer reference after the #, where no
 * server, log or analytics event ever sees it.
 */
export function offerSignupHref(offer: Pick<LeaderOffer, "code" | "ref">) {
  const params = new URLSearchParams({ plan: "centre_starter" });
  if (offer.code && /^[A-Z2-9]{5,12}$/.test(offer.code)) params.set("ref", offer.code);
  params.set("utm_source", "leader_check");
  params.set("utm_medium", "product");
  return `/signup?${params.toString()}${offer.ref && looksLikeOfferRef(offer.ref) ? `#lo=${offer.ref}` : ""}`;
}

/** Where an offer reference waits on one device between the leader's page, signup and My centre. */
export const OFFER_STORAGE_KEY = "storyloop_leader_offer";
/** How long it waits there. On a shared office computer, the next account to open My centre a day later must not claim it. */
export const OFFER_STORAGE_HOURS = 24;

/** The value to keep in browser storage: the reference and when it was kept. Pure. */
export function offerStorageValue(ref: string, now = new Date()) {
  return JSON.stringify({ ref, at: now.getTime() });
}

/**
 * The reference from a stored value, or "" when it is older than a day, from
 * the future, malformed, or a bare reference kept before it carried a time. Pure.
 */
export function offerRefFromStorage(raw: string | null | undefined, now = new Date()) {
  if (!raw) return "";
  try {
    const value = JSON.parse(raw) as { ref?: unknown; at?: unknown };
    const at = typeof value.at === "number" ? value.at : Number.NaN;
    if (!Number.isFinite(at) || at > now.getTime() + 60_000 || now.getTime() - at > OFFER_STORAGE_HOURS * 3_600_000) return "";
    return looksLikeOfferRef(value.ref) ? value.ref : "";
  } catch {
    return "";
  }
}

/** The offer reference from a signup page's # part, or "". */
export function offerRefFromHash(hash: string) {
  const match = /(?:^|[#&])lo=([A-Za-z0-9_-]{43})(?:&|$)/.exec(hash);
  return match ? match[1] : "";
}

/**
 * What a check's offer reference becomes when the educator cancels her link or
 * makes a new one: a value no reference can hash to (a hash is 43 URL-safe
 * characters with no colon), unique per check for the column's unique index,
 * and never filled in again with a live reference. Pure.
 */
export function offerEndedMarker(checkId: string) {
  return `ended:${checkId}`;
}

/** Whether a stored offer reference hash is the ended marker. Pure. */
export function offerEnded(storedHash: string | null | undefined) {
  return typeof storedHash === "string" && storedHash.startsWith("ended:");
}

/**
 * May a check's offer still fill in a centre's set-up and invite its educator?
 * Never once the educator has cancelled the link; otherwise for a while after
 * it stopped opening the story, because a centre often decides a week or two
 * after the leader has looked. Pure.
 */
export function canUseOffer(row: Pick<CheckRow, "expires_at" | "revoked_at">, now = new Date()) {
  if (row.revoked_at) return false;
  const expires = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expires)) return false;
  return now.getTime() < expires + OFFER_GRACE_DAYS * 86_400_000;
}

/**
 * Exactly what the leader's page receives. Built field by field so that adding
 * a column to stories or profiles can never leak it through the link.
 */
export function leaderView(input: { story: StoryForLeader; check: CheckRow; educatorName: string | null | undefined; now?: Date; offer?: LeaderOffer | null }) {
  const { story, check } = input;
  const now = input.now ?? new Date();
  // null: no offer block at all (she ended it, or she is already in a centre).
  // undefined: a row from before the offer existed, so the offer without a code.
  const offer = input.offer;
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
    centreName: cleanCentreName(check.centre_name ?? ""),
    // The numbers only if she ticked the box, and only if there are enough of them.
    offer: offer === null
      ? null
      : {
          code: offer?.code ?? null,
          ref: offer?.ref ?? null,
          counts: check.share_counts === true ? offer?.counts ?? null : null,
        },
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
