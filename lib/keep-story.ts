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

/**
 * Kept without a tap (18 Nov 2026). Until now a draft was kept only when she
 * tapped "Keep this story"; 0 of 29 new accounts arrived with one, because a
 * visitor who wrote a draft and then tapped Start free anywhere else lost it.
 * Now every draft she writes herself is remembered as she writes it, marked
 * `auto`. An auto draft is shown on the signup page ("your story is waiting")
 * and only goes into an account after the signup page has shown it
 * (confirmKeptDrafts), so a signed-in visitor trying the demo never finds a
 * draft dropped into her account unasked. It is forgotten after
 * KEEP_AUTO_MAX_AGE_MS, so a shared centre tablet does not hand one person's
 * draft to the next. A tap on Keep stores it as before, for the full week.
 */
export const KEEP_AUTO_MAX_AGE_MS = 2 * 3_600_000;

/** Whether a stored draft may be used: an auto draft only while fresh, and for an account only once confirmed. */
export function keptDraftUsable(raw: unknown, now = Date.now(), includeUnconfirmed = false): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const value = raw as Record<string, unknown>;
  if (value.auto !== true) return true;
  const at = typeof value.at === "number" ? value.at : NaN;
  if (!Number.isFinite(at) || now - at > KEEP_AUTO_MAX_AGE_MS) return false;
  return includeUnconfirmed;
}

export function rememberStory(note: string, story: string, framework: KeptFramework | null, auto = false) {
  try {
    const kept: Record<string, unknown> = { note: note.slice(0, KEEP_NOTE_MAX), story: story.slice(0, KEEP_STORY_MAX), framework, at: Date.now() };
    if (auto) kept.auto = true;
    window.localStorage.setItem(KEEP_STORY_KEY, JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

/** The kept story, for an account (confirmed only) or, with `includeUnconfirmed`, for the signup page. */
export function readKeptStory({ includeUnconfirmed = false }: { includeUnconfirmed?: boolean } = {}): KeptStory | null {
  try {
    const raw = window.localStorage.getItem(KEEP_STORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return keptDraftUsable(parsed, Date.now(), includeUnconfirmed) ? cleanKeptStory(parsed) : null;
  } catch {
    return null;
  }
}

/**
 * The signup page has told her the draft is waiting: from here it goes into
 * the new account on its first load. Clears the auto mark and keeps the time
 * it was written, so the week's limit still runs from the draft itself.
 */
export function confirmKeptDrafts() {
  for (const key of [KEEP_STORY_KEY, KEEP_STATEMENT_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || parsed.auto !== true) continue;
      if (!keptDraftUsable(parsed, Date.now(), true)) {
        window.localStorage.removeItem(key);
        continue;
      }
      delete parsed.auto;
      window.localStorage.setItem(key, JSON.stringify(parsed));
    } catch {
      /* nothing to confirm */
    }
  }
}

export function forgetKeptStory() {
  try {
    window.localStorage.removeItem(KEEP_STORY_KEY);
  } catch {
    /* nothing to forget */
  }
}

/**
 * "Keep my draft" for the statement and summary drafter on the guides (18 Nov
 * 2026). The guide drafter writes a transition statement or an end-of-year
 * summary, not a story, so it cannot go through the story keep above: a
 * statement is not a story and must not count as one. In the app a statement
 * is not saved either (the page says so: copy what you want to keep), so the
 * kept draft waits in this browser and is shown again on /statement after
 * signup, ready to copy. Only the draft is kept, never the notes it came from.
 */
export const KEEP_STATEMENT_KEY = "storyloop_keep_statement";
const KEEP_OUTCOMES_MAX = 8;
const KEEP_FIELD_MAX = 1500;
const KEEP_CHECKS_MAX = 8;

export type KeptStatementFramework = "VEYLDF" | "EYLF" | "QKLG" | "TW";
export type KeptStatementMode = "transition" | "summary";
export type KeptStatementOutcome = { outcome: string; seen: string; strategy: string; gap: string };
export type KeptStatement = {
  framework: KeptStatementFramework;
  mode: KeptStatementMode;
  outcomes: KeptStatementOutcome[];
  checks: string[];
  at: number;
};

const STATEMENT_FRAMEWORKS = new Set<string>(["VEYLDF", "EYLF", "QKLG", "TW"]);
const STATEMENT_MODES = new Set<string>(["transition", "summary"]);
const field = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, KEEP_FIELD_MAX) : "");

/** A kept statement draft as it may be trusted: known curriculum and kind, sane sizes, recent, at least one outcome with words. */
export function cleanKeptStatement(raw: unknown, now = Date.now()): KeptStatement | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const framework = typeof value.framework === "string" && STATEMENT_FRAMEWORKS.has(value.framework) ? (value.framework as KeptStatementFramework) : null;
  const mode = typeof value.mode === "string" && STATEMENT_MODES.has(value.mode) ? (value.mode as KeptStatementMode) : null;
  const at = typeof value.at === "number" && Number.isFinite(value.at) ? value.at : NaN;
  if (!framework || !mode) return null;
  if (!Number.isFinite(at) || at > now + 60_000 || now - at > KEEP_STORY_MAX_AGE_MS) return null;
  const outcomes = (Array.isArray(value.outcomes) ? value.outcomes : [])
    .slice(0, KEEP_OUTCOMES_MAX)
    .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object" && !Array.isArray(o))
    .map((o) => ({ outcome: field(o.outcome), seen: field(o.seen), strategy: field(o.strategy), gap: field(o.gap) }))
    .filter((o) => o.outcome && (o.seen || o.gap));
  if (!outcomes.some((o) => o.seen)) return null;
  const checks = (Array.isArray(value.checks) ? value.checks : []).map(field).filter(Boolean).slice(0, KEEP_CHECKS_MAX);
  return { framework, mode, outcomes, checks, at };
}

/** The label the drafter puts before each strategy line, so the kept copy reads exactly as the draft did. */
export function keptStrategyLabel(framework: KeptStatementFramework, mode: KeptStatementMode): string {
  if (mode === "summary") return "Next step";
  return { VEYLDF: "Strategy for the Prep teacher", EYLF: "Strategy for the school teacher", QKLG: "Suggestion for continuity", TW: "Strategy for the new entrant teacher" }[framework];
}

/** The same text the drafter's Copy all gives. */
export function keptStatementText(kept: KeptStatement): string {
  const label = keptStrategyLabel(kept.framework, kept.mode);
  return kept.outcomes
    .map((o) => [o.outcome, o.seen ? `What I saw: ${o.seen}` : `Not in my notes yet: ${o.gap}`, o.strategy ? `${label}: ${o.strategy}` : ""].filter(Boolean).join("\n"))
    .join("\n\n");
}

export function rememberStatement(draft: Omit<KeptStatement, "at">, auto = false) {
  try {
    const clean = cleanKeptStatement({ ...draft, at: Date.now() });
    if (!clean) return false;
    window.localStorage.setItem(KEEP_STATEMENT_KEY, JSON.stringify(auto ? { ...clean, auto: true } : clean));
    return true;
  } catch {
    return false;
  }
}

/** The kept statement, for an account (confirmed only) or, with `includeUnconfirmed`, for the signup page. */
export function readKeptStatement({ includeUnconfirmed = false }: { includeUnconfirmed?: boolean } = {}): KeptStatement | null {
  try {
    const raw = window.localStorage.getItem(KEEP_STATEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return keptDraftUsable(parsed, Date.now(), includeUnconfirmed) ? cleanKeptStatement(parsed) : null;
  } catch {
    return null;
  }
}

export function forgetKeptStatement() {
  try {
    window.localStorage.removeItem(KEEP_STATEMENT_KEY);
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
