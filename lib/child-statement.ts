import { MAX_TRANSITION_NOTES, MIN_TRANSITION_NOTES, type TransitionFramework } from "@/lib/ai/transition-draft";

/**
 * A child's year of stories, turned into their transition statement or
 * end-of-year summary in one step (3 Nov 2026). The no-signup version on the
 * guides drafts from notes pasted in; this one drafts from the notes the
 * educator already saved about the child, which is the part no general AI chat
 * can do: it has no record of the child's year.
 *
 * The drafter only sees the educator's own observations (never the AI-written
 * stories), so every quote it keeps is one the educator wrote down.
 */
export const STATEMENT_FREE_LIMIT = 2; // per 30 days on the free plan
export const STATEMENT_PAID_LIMIT = 30; // per day on a paid plan
export const STATEMENT_MIN_STORIES = 2;
export const STATEMENT_STORY_LIMIT = 60;

export type StatementStory = { date: string; observations: string | null };

/**
 * The most recent observations that fit the drafter's limit, oldest first, each
 * starting with its date so the draft can describe change over time.
 */
export function notesFromStories(stories: StatementStory[], max = MAX_TRANSITION_NOTES - 100): { notes: string; used: number } {
  const lines: string[] = [];
  let length = 0;
  const newestFirst = [...stories].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const story of newestFirst) {
    const text = (story.observations ?? "").replace(/\s+/g, " ").trim();
    if (text.length < 15) continue;
    const line = `${story.date}: ${text}`;
    if (length + line.length + 1 > max) {
      if (lines.length === 0) lines.push(line.slice(0, max));
      break;
    }
    lines.push(line);
    length += line.length + 1;
  }
  return { notes: lines.reverse().join("\n"), used: lines.length };
}

export function enoughNotes(notes: string) {
  return notes.trim().length >= MIN_TRANSITION_NOTES;
}

/** The educator's curriculum setting to the drafter's framework. England and Ireland are not supported yet. */
export function statementFrameworkFor(defaultFramework: string | null | undefined): TransitionFramework | null {
  if (defaultFramework === "NZ") return "TW";
  if (defaultFramework === "UK" || defaultFramework === "IE") return null;
  return "EYLF";
}
