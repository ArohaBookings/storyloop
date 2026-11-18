/**
 * Asking for a review at the moment she copies a story (18 Nov 2026).
 *
 * The ask lived on the dashboard, which 20 sessions visited in 60 days, and
 * after six months StoryLoop had no reviews at all. On 11 Nov it moved under a
 * finished story; now it moves to the moment she copies one, which is when
 * the story has done its job. Nothing shows before that. The dashboard no
 * longer asks, so there is one ask, with one set of rules:
 *
 * - never before her second copy (two different stories copied),
 * - never twice in 30 days, whatever device she is on,
 * - one tap on "No thanks" and it never asks again,
 * - never an account that has already sent a review, never an internal one.
 *
 * The rules that keep it honest (ACCC and Commerce Commission guidance on
 * reviews): everybody is asked the same way whatever they are likely to say,
 * every rating goes to the same moderated queue, nothing is offered in return,
 * and nothing is shown publicly until StoryLoop publishes it from admin. Public
 * pages show real published reviews only, never a made-up one and never a
 * number of them (components/landing/ReviewProof.tsx).
 */

/** Copies (of different stories) before she is asked: never before her second. */
export const COPY_REVIEW_MIN_COPIES = 2;
/** One ask per account in this many days, whatever device they are on. */
export const STORY_REVIEW_GAP_DAYS = 30;
/**
 * How long after the tap the page asks the server. The copy's own event is
 * sent at the tap, so by then it has normally been stored and is counted; if
 * it has not, she is asked at a later copy, never an earlier one.
 */
export const REVIEW_ASK_DELAY_MS = 1200;
/** Shown in place of a name when the reviewer asks for that. */
export const ANONYMOUS_REVIEWER = "An early childhood educator";

/** The events that count as a copy of a story (lib/analytics/events.ts). */
export const COPY_EVENTS = ["app_story_copied", "copy_pack_copied"] as const;
/** The events that mean she was asked, or answered: the next ask waits STORY_REVIEW_GAP_DAYS. */
export const ASKED_EVENTS = ["review_ask_shown", "review_ask_sent", "story_rating"] as const;
/** The event that means "No thanks": never asked again. */
export const DISMISSED_EVENT = "review_ask_dismissed";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A story id from a request, or null: an id only, never anything typed. */
export function cleanStoryId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
}

/**
 * How many copies count toward "her second copy" (pure): copies of different
 * stories. Two copies of the same story are one; a copy event with no story id
 * (a story not saved yet) counts on its own.
 */
export function countCopies(rows: Array<{ metadata?: unknown } | null | undefined>): number {
  const stories = new Set<string>();
  let unsaved = 0;
  for (const row of rows) {
    if (!row) continue;
    const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
    const id = cleanStoryId(metadata.story_id);
    if (id) stories.add(id);
    else unsaved += 1;
  }
  return stories.size + unsaved;
}

export function shouldAskAtCopy(input: {
  /** Copies of different stories, this one included once its event is stored (countCopies). */
  copies: number;
  /** Reviews this account has already sent, published or not. */
  reviews: number;
  internal: boolean;
  /** She tapped "No thanks" at some point. */
  dismissed: boolean;
  /** When the ask last appeared for this account, or a rating was last tapped. */
  lastAskedAt: string | Date | null | undefined;
  now?: Date;
}): boolean {
  if (input.internal) return false;
  if (input.dismissed) return false;
  if (input.reviews > 0) return false;
  if (!(input.copies >= COPY_REVIEW_MIN_COPIES)) return false;
  if (input.lastAskedAt) {
    const last = input.lastAskedAt instanceof Date ? input.lastAskedAt.getTime() : Date.parse(input.lastAskedAt);
    const now = (input.now ?? new Date()).getTime();
    if (Number.isFinite(last) && now - last < STORY_REVIEW_GAP_DAYS * 86_400_000) return false;
  }
  return true;
}

/** A whole number from 1 to 5, or null. */
export function cleanRating(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
