/**
 * Asking for a review at the story, where people actually are (11 Nov 2026).
 *
 * The ask lived on the dashboard, which 20 sessions visited in 60 days, and
 * after six months StoryLoop had no reviews at all. Nearly everybody who uses
 * the product is on the story page, so the ask moved there: one quiet row
 * under a finished story, never in front of one.
 *
 * The rules that keep it honest (ACCC and Commerce Commission guidance on
 * reviews): everybody is asked the same way whatever they are likely to say,
 * every rating goes to the same moderated queue, nothing is offered in return,
 * and nothing is shown publicly without the words "we may share it".
 */

/** Stories somebody must have written before being asked. The third story or later. */
export const STORY_REVIEW_MIN_STORIES = 3;
/** One ask per account in this many days, whatever device they are on. */
export const STORY_REVIEW_GAP_DAYS = 30;
/** Shown in place of a name when the reviewer asks for that. */
export const ANONYMOUS_REVIEWER = "An early childhood educator";

export function shouldAskAtStory(input: {
  stories: number;
  /** Reviews this account has already sent, published or not. */
  reviews: number;
  internal: boolean;
  /** When the ask last appeared for this account, or a rating was last tapped. */
  lastAskedAt: string | Date | null | undefined;
  now?: Date;
}): boolean {
  if (input.internal) return false;
  if (input.reviews > 0) return false;
  if (input.stories < STORY_REVIEW_MIN_STORIES) return false;
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
