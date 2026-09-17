import { matchDispositions, type Disposition } from "@/lib/term-weather";

/**
 * Transition pack: "please don't start from zero".
 *
 * When a child leaves for school, a new room or a new service, the people who
 * know them best usually hand over nothing but a name. This assembles a short,
 * printable pack from what is already recorded: a handful of real moments the
 * educator chooses, the child's voice line exactly as each story saved it, the
 * family's aspirations and replies in their own words, languages at home, what
 * the child loves, how they tend to learn, and where to pick up.
 *
 * ASSEMBLY, NOT GENERATION. Every line is copied from a saved story or the
 * child's profile. No model call, so nothing is invented, nothing is paraphrased,
 * and it costs nothing. A child's voice line and a family's words are never
 * edited. A child's voice line is not always a direct quote (the story writer
 * may summarise when no quote was given), so it is shown as written and never
 * wrapped in quotation marks.
 *
 * It leaves the building, so nothing is ever sent from here. The educator
 * prints it and shares it themselves, with the family's agreement.
 */

export type PackAudience = "teacher" | "family";

export type PackChild = {
  name: string;
  interests: string[] | null;
  homeLanguages: string[] | null;
  whanauAspirations: string | null;
};

export type PackStory = {
  id: string;
  date: string;
  title: string | null;
  learningSummary: string | null;
  childVoice: string | null;
  whanauVoice: string | null;
  dispositions: string[];
  nextSteps: Array<{ text: string; status: string }>;
};

export type TransitionPack = {
  /** Small label above the child's name. */
  eyebrow: string;
  title: string;
  destinationLine: string | null;
  headings: Record<"family" | "languages" | "loves" | "learns" | "moments" | "pickUp", string>;
  familyWords: string[];
  languages: string[];
  loves: string[];
  learns: string[];
  moments: Array<{ id: string; date: string; title: string; summary: string | null; childVoice: string | null }>;
  pickUp: string[];
  closing: string;
};

export const MAX_PACK_STORIES = 6;
export const MAX_DESTINATION_LENGTH = 80;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * A saved story row, read the same way the Learning Loop panel reads it: saved
 * next-step progress wins, otherwise every generated next step is still planned.
 */
export function packStoryFromRow(row: { id: string; date: string; next_steps?: unknown; metadata?: unknown }): PackStory {
  const metadata = record(row.metadata);
  const saved = Array.isArray(metadata.nextStepProgress)
    ? metadata.nextStepProgress.flatMap((entry) => {
        const item = record(entry);
        const stepText = typeof item.text === "string" ? item.text.trim() : "";
        const status = item.status === "tried" || item.status === "continue" ? item.status : "planned";
        return stepText ? [{ text: stepText, status }] : [];
      })
    : [];
  const generated = Array.isArray(row.next_steps)
    ? row.next_steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => ({ text: s.trim(), status: "planned" }))
    : [];
  const dispositions = Array.isArray(metadata.learningDispositions)
    ? metadata.learningDispositions.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : [];

  return {
    id: row.id,
    date: row.date,
    title: text(metadata.storyTitle),
    learningSummary: text(metadata.learningSummary),
    childVoice: text(metadata.childVoice),
    whanauVoice: text(metadata.whanauVoice),
    dispositions,
    nextSteps: saved.length ? saved : generated,
  };
}

/** Default selection: the most recent stories that actually have something to say. */
export function defaultPackSelection(stories: PackStory[], limit = MAX_PACK_STORIES): string[] {
  return [...stories]
    .filter((s) => clean(s.learningSummary) || clean(s.childVoice))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((s) => s.id);
}

/**
 * What the educator asked for, made safe: only this child's stories, no
 * duplicates, and at most MAX_PACK_STORIES (the most recent win, so ticking
 * one too many drops the oldest rather than the newest).
 */
export function resolvePackSelection(stories: PackStory[], requested: string[] | null): { ids: string[]; trimmed: boolean } {
  if (requested === null) return { ids: defaultPackSelection(stories), trimmed: false };
  const wanted = new Set(requested);
  const matching = stories.filter((s) => wanted.has(s.id)).sort((a, b) => b.date.localeCompare(a.date));
  return { ids: matching.slice(0, MAX_PACK_STORIES).map((s) => s.id), trimmed: matching.length > MAX_PACK_STORIES };
}

export function cleanDestination(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const tidy = value.replace(/\s+/g, " ").trim().slice(0, MAX_DESTINATION_LENGTH).trim();
  return tidy || null;
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function listOf(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function howMany(n: number, total: number) {
  if (n < total) return `in ${n} of these ${total} moments`;
  return total === 1 ? "in this moment" : total === 2 ? "in both moments" : `in all ${total} moments`;
}

export function buildTransitionPack(input: {
  child: PackChild;
  stories: PackStory[];
  selectedIds: string[];
  audience: PackAudience;
  destination?: string | null;
}): TransitionPack {
  const { child, audience } = input;
  const name = clean(child.name) || "This child";
  const selected = new Set(resolvePackSelection(input.stories, input.selectedIds).ids);
  // Chronological, oldest first: a pack reads as a journey.
  const chosen = input.stories.filter((s) => selected.has(s.id)).sort((a, b) => a.date.localeCompare(b.date));

  // Family words: aspirations from the profile, then replies from chosen stories,
  // exactly as written, de-duplicated.
  const familyWords = [
    clean(child.whanauAspirations),
    ...chosen.map((s) => clean(s.whanauVoice)),
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  // How they learn: dispositions across the chosen moments, most frequent first,
  // stated as what the stories recorded, never as a trait the child "is".
  const counts = new Map<Disposition, number>();
  for (const story of chosen) {
    const seen = new Set<Disposition>();
    for (const phrase of story.dispositions) for (const d of matchDispositions(phrase)) seen.add(d);
    for (const d of seen) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Anything seen in more than one moment gets its own line. Across several
  // moments, the ones seen once are gathered into a single line, so a long
  // list of "1 of these 6" does not drown out what kept coming back.
  const learns: string[] = [];
  if (chosen.length === 1 && ranked.length) {
    learns.push(`${capitalise(listOf(ranked.slice(0, 5).map(([d]) => d)))} came through in this moment.`);
  } else {
    for (const [d, n] of ranked.filter(([, n]) => n > 1).slice(0, 4)) {
      learns.push(`${capitalise(d)} came through ${howMany(n, chosen.length)}.`);
    }
    const once = ranked.filter(([, n]) => n === 1).map(([d]) => d);
    if (once.length) learns.push(`${learns.length ? "Also" : "Each"} in one moment: ${listOf(once.slice(0, 5))}.`);
  }

  // Where to pick up: next steps still planned or worth continuing. "Tried" ones
  // are finished and are not handed on.
  const pickUp = chosen
    .flatMap((s) => s.nextSteps)
    .filter((step) => step && clean(step.text) && (step.status === "planned" || step.status === "continue"))
    .map((step) => clean(step.text))
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 6);

  const destination = cleanDestination(input.destination);
  const family = audience === "family";

  return {
    eyebrow: family ? "A learning journey" : "Transition pack",
    title: name,
    destinationLine: destination ? (family ? `For ${name}'s next step at ${destination}.` : `Prepared for ${destination}.`) : null,
    headings: {
      family: family ? "In your own words" : "In the family's own words",
      languages: "Languages at home",
      loves: family ? "What lights them up" : "What they love",
      learns: family ? "How we saw them learn" : "How they tend to learn",
      moments: family ? "Moments we will remember" : "Moments worth knowing",
      pickUp: family ? "Things to keep encouraging" : "Where to pick up",
    },
    familyWords,
    languages: (child.homeLanguages ?? []).map((l) => clean(l)).filter(Boolean),
    loves: (child.interests ?? []).map((i) => clean(i)).filter(Boolean),
    learns,
    moments: chosen.map((s) => ({
      id: s.id,
      date: s.date,
      title: clean(s.title) || "A moment",
      summary: clean(s.learningSummary) || null,
      // Exactly as the story saved it. Never tidied, never put in quotation marks.
      childVoice: typeof s.childVoice === "string" && s.childVoice.trim() ? s.childVoice : null,
    })),
    pickUp,
    closing: family
      ? `Thank you for sharing ${name} with us.`
      : `Please don't start from zero. ${name} arrives already knowing a great deal.`,
  };
}
