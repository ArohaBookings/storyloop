/**
 * How much Check my story takes (lib/check-my-story.ts), in a file of its own
 * so the public page's note boxes can use the numbers without carrying the
 * check itself to the browser.
 */

/**
 * The public page /check-my-story and its API, for anyone signed out.
 *
 * HELD (release decision, 19 Nov 2026: the public page waits until January).
 * Off, /check-my-story and /api/check-my-story answer 404, the page is not in
 * the sitemap and nothing links to it. The check itself ships either way,
 * inside the app: in a leader's team review queue and on an educator's own
 * story before she sends it to her leader.
 *
 * To switch it on: set true here (the one place), and put /check-my-story on
 * the list of pages that never load an advertising tag, because people paste
 * stories about real children into it.
 */
export const CHECK_MY_STORY_PUBLIC = false;

/** The most a pasted story or note may be. Longer text is refused, not cut. */
export const CHECK_STORY_MAX = 15_000;
export const CHECK_NOTE_MAX = 8_000;
/** Shorter than this and there is nothing worth checking. */
export const CHECK_STORY_MIN = 60;
export const CHECK_NOTE_MIN = 10;
