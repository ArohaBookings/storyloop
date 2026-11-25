/**
 * From a statement to the weekly job (B8, 25 Nov 2026). Australians arrive for
 * one statement and stop: only 19% of Australian writers reach a third story,
 * against 44% in New Zealand. Under a finished statement draft on /statement,
 * one line and one button carry the same note into the story screen.
 *
 * The note travels the way the demo's note does (lib/keep-story.ts, B5): in
 * this browser only, 20 to 2000 characters, for 2 hours, read once. The
 * child's first name goes in this tab's sessionStorage, never in the URL.
 */
import { noteToKeep, rememberNote, takeKeptNote } from "@/lib/keep-story";

/** Where the button goes. The flag says "a note is waiting"; it carries no data. */
export const STATEMENT_TO_STORY_HREF = "/generate?carry=statement";
export const CARRY_PARAM = "carry";
export const CARRY_FROM_STATEMENT = "statement";
export const CARRY_NAME_KEY = "storyloop_carry_name";

/** A first name fit for the button and the story box: one word, letters only, or "". Pure. */
export function carriedFirstName(raw: string | null | undefined): string {
  const first = String(raw ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/^[\p{L}][\p{L}'’-]{0,29}$/u.test(first)) return "";
  return first;
}

/** The button's words. Pure. */
export function statementToStoryLabel(firstName: string): string {
  const name = carriedFirstName(firstName);
  return name ? `Write ${name}'s learning story from the same note` : "Write a learning story from the same note";
}

/** Whether the note can be carried (the button shows only then, so it never promises a note it cannot bring). Pure. */
export function canCarryStatementNote(notes: string, usingSample: boolean): boolean {
  return !usingSample && noteToKeep(notes, []) !== null;
}

/** Keeps the note (and the name, in this tab) for the story screen; true when the note was kept. */
export function carryStatementToStory(notes: string, firstName: string): boolean {
  if (!rememberNote(notes, [])) return false;
  try {
    const name = carriedFirstName(firstName);
    if (name) window.sessionStorage.setItem(CARRY_NAME_KEY, name);
    else window.sessionStorage.removeItem(CARRY_NAME_KEY);
  } catch {
    /* the note still travels; the name box stays empty */
  }
  return true;
}

/** On the story screen: the carried note and name, once each. */
export function takeCarriedStatement(): { note: string; name: string } | null {
  const note = takeKeptNote();
  let name = "";
  try {
    name = carriedFirstName(window.sessionStorage.getItem(CARRY_NAME_KEY));
    window.sessionStorage.removeItem(CARRY_NAME_KEY);
  } catch {
    /* no name */
  }
  return note ? { note, name } : null;
}
