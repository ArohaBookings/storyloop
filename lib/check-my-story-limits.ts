/**
 * How much Check my story takes (lib/check-my-story.ts), in a file of its own
 * so the public page's note boxes can use the numbers without carrying the
 * check itself to the browser.
 */

/** The most a pasted story or note may be. Longer text is refused, not cut. */
export const CHECK_STORY_MAX = 15_000;
export const CHECK_NOTE_MAX = 8_000;
/** Shorter than this and there is nothing worth checking. */
export const CHECK_STORY_MIN = 60;
export const CHECK_NOTE_MIN = 10;
