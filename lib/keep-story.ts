/**
 * "Keep this story" (3 Nov 2026). A visitor who writes a story in the no-signup
 * demo used to lose it the moment they signed up: the draft lived only on the
 * page. Now the demo remembers the draft in this browser, the signup page says
 * it is waiting, and the app saves it into the new account on first load
 * (components/app/KeepStoryImporter.tsx, app/api/stories/keep/route.ts).
 *
 * Shared by the browser and the server, so both apply the same limits.
 */
export const KEEP_STORY_KEY = "storyloop_keep_story";
export const KEEP_STORY_MAX_AGE_MS = 7 * 86_400_000;
export const KEEP_NOTE_MAX = 2000;
export const KEEP_STORY_MIN = 80;
export const KEEP_STORY_MAX = 8000;

export type KeptFramework = "NZ" | "AU" | "UK" | "IE";
export type KeptStory = { note: string; story: string; framework: KeptFramework | null; at: number };

const FRAMEWORKS = new Set<KeptFramework>(["NZ", "AU", "UK", "IE"]);

/** A kept story as it may be trusted: right types, sane lengths, recent. Anything else is null. */
export function cleanKeptStory(raw: unknown, now = Date.now()): KeptStory | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const note = typeof value.note === "string" ? value.note.trim().slice(0, KEEP_NOTE_MAX) : "";
  const story = typeof value.story === "string" ? value.story.trim() : "";
  const at = typeof value.at === "number" && Number.isFinite(value.at) ? value.at : NaN;
  const framework = typeof value.framework === "string" && FRAMEWORKS.has(value.framework as KeptFramework) ? (value.framework as KeptFramework) : null;
  if (!note || story.length < KEEP_STORY_MIN || story.length > KEEP_STORY_MAX) return null;
  if (!Number.isFinite(at) || at > now + 60_000 || now - at > KEEP_STORY_MAX_AGE_MS) return null;
  return { note, story, framework, at };
}

/** The story's own first line is its title, as the writer returns it. */
export function keptStoryTitle(story: string): string {
  const first = story.trim().split("\n").find((line) => line.trim().length > 0) ?? "";
  return first.trim().slice(0, 80) || "My first learning story";
}

export function rememberStory(note: string, story: string, framework: KeptFramework | null) {
  try {
    window.localStorage.setItem(KEEP_STORY_KEY, JSON.stringify({ note: note.slice(0, KEEP_NOTE_MAX), story: story.slice(0, KEEP_STORY_MAX), framework, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readKeptStory(): KeptStory | null {
  try {
    const raw = window.localStorage.getItem(KEEP_STORY_KEY);
    return raw ? cleanKeptStory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function forgetKeptStory() {
  try {
    window.localStorage.removeItem(KEEP_STORY_KEY);
  } catch {
    /* nothing to forget */
  }
}

/** The curriculum a draft was written for, from its own links (the demo response does not say). */
export function frameworkFromStory(story: string): KeptFramework | null {
  if (/Te Wh[aā]riki|Mana (atua|whenua|tangata|reo|aot[uū]roa)/i.test(story)) return "NZ";
  if (/\bEYFS\b|Early Years Foundation Stage/i.test(story)) return "UK";
  if (/\bAistear\b/i.test(story)) return "IE";
  if (/\bEYLF\b|Outcome [1-5]/i.test(story)) return "AU";
  return null;
}
