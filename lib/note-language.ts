import { quotedPhrases } from "@/lib/family-link";

/**
 * "My note is not in English" (10 Nov 2026).
 *
 * Many educators think, and jot, in the language they grew up with. They can
 * write or say the note that way, and StoryLoop puts it into plain English for
 * them to check BEFORE any story is written. The story writer is untouched: it
 * receives an English note, as it always has.
 *
 * Two rules, checked here so they can be tested without a model:
 *  - What a child said stays exactly as it was said, in the child's own
 *    language, with its meaning in brackets beside it. A reading that drops or
 *    changes one quoted word is refused.
 *  - It is still a note. A reading that grew into a story, or lost most of the
 *    note, is refused.
 */
export const NOTE_ENGLISH_MAX_CHARS = 2000;

/** Letters outside the Latin alphabets: a strong sign the note is not in English. */
export function looksNonLatin(note: string) {
  const letters = note.match(/\p{L}/gu) ?? [];
  if (letters.length < 12) return false;
  const other = letters.filter((letter) => !/\p{Script=Latin}/u.test(letter)).length;
  return other / letters.length > 0.2;
}

export function isUsableNoteEnglish(original: string, candidate: unknown): candidate is { already_english: boolean; english: string; language: string } {
  if (!candidate || typeof candidate !== "object") return false;
  const c = candidate as Record<string, unknown>;
  if (typeof c.already_english !== "boolean" || typeof c.english !== "string" || typeof c.language !== "string") return false;
  if (c.already_english) return true;
  const english = c.english.trim();
  const source = original.trim();
  if (!english || !source) return false;
  // Still a note: not a fraction of it, and not a story grown from it.
  if (english.length < source.length * 0.3 || english.length > source.length * 4 + 200) return false;
  // Every word a child said is still there, exactly.
  return quotedPhrases(source).every((phrase) => english.includes(phrase));
}
