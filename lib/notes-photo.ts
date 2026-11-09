/**
 * The mark "Photo of my notes" leaves where a word could not be read. Kept
 * apart from lib/ai/read-notes.ts so the story page (a browser bundle) can use
 * it without pulling in the AI client and prompts.
 */
export const UNCLEAR_MARK = "[unclear]";

/** True while a note still carries a word the photo reader could not read. */
export function hasUnclearMark(note: string) {
  return /\[unclear\]/i.test(note);
}
