/**
 * What tended to work.
 *
 * StoryLoop records something nobody else does. Every platform stores the plan;
 * this one stores what happened when an educator went back to it, because a
 * next step is marked planned, tried, or worth continuing. That turns a pile of
 * documentation into an outcomes dataset at a resolution no researcher,
 * ministry or platform has ever had: not what educators intended, but what they
 * came back and said was worth doing again.
 *
 * It is the only asset here that cannot be bought, because it cannot be bought,
 * only accumulated, and it improves every time somebody closes a loop.
 *
 * TWO MODES, AND THE FIRST ONE WORKS TODAY.
 *
 *   own     one educator's own closed loops. No sharing, no thresholds, no
 *           privacy question at all, and useful from the first week.
 *   shared  the same signal across services that opted in. Useful only at
 *           scale, and suppressed until then.
 *
 * WHY THE SHARED MODE IS SAFE, and it is not because of a promise. Next-step
 * text is free text and can contain a child: "offer Ruby the longer pipes".
 * The defence is structural rather than a filter that must be perfect. A phrase
 * only surfaces once several INDEPENDENT services have written something that
 * normalises to the same thing, and a phrase carrying a child's name occurs in
 * exactly one service, forever. Idiosyncratic text cannot reach the threshold,
 * so it is excluded by the shape of the rule and not by our cleverness at
 * spotting names. The name filter below is a second line, not the first.
 *
 * IT NEVER CLAIMS CAUSATION. "Educators who tried this more often came back and
 * marked it worth continuing" is what the data says. "This works" is not, and
 * nothing here is permitted to say it.
 */

export type PracticeOutcome = "planned" | "tried" | "continue";

export type PracticeRecord = {
  /** Opaque per-service id. Counted, never surfaced. */
  serviceId: string;
  /** What the moment was about: a curriculum link or disposition from a known set. */
  theme: string;
  /** The next step, as the educator wrote it. */
  text: string;
  outcome: PracticeOutcome;
};

export type PracticeSignal = {
  theme: string;
  phrase: string;
  /** Times this was recorded as tried or worth continuing. */
  revisited: number;
  /** Times it was specifically marked worth continuing. */
  worthContinuing: number;
  /** Distinct services behind it. 1 in "own" mode by definition. */
  services: number;
};

export const MIN_SERVICES_PER_SIGNAL = 4;
export const MIN_TIMES_PER_SIGNAL = 6;
/** Own-mode is one person's own history, so it only needs to have happened twice. */
export const MIN_TIMES_OWN = 2;

const MAX_PHRASE_WORDS = 12;
/**
 * Fewer words than this and it is not a practice, it is a shrug. "Try again"
 * clears any character count and tells a reader nothing about what to do.
 */
const MIN_PHRASE_WORDS = 3;

/**
 * Ordinary words that start a next step, so a capital letter on one is not a
 * sign of a name. Anything else capitalised mid-phrase excludes the phrase.
 */
const SENTENCE_STARTERS = new Set([
  "offer", "give", "invite", "ask", "try", "set", "bring", "put", "keep", "revisit", "extend",
  "add", "take", "show", "read", "find", "make", "build", "plan", "provide", "introduce",
  "continue", "follow", "encourage", "support", "repeat", "swap", "move", "leave", "let",
]);

/**
 * Reduce a next step to a comparable phrase, or reject it.
 *
 * Rejection is cheap and silence is safe: a step that cannot be normalised
 * simply does not contribute. There is no cost to dropping a good one and a
 * permanent cost to keeping a bad one.
 */
export function normalisePractice(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const words = trimmed.split(" ");
  if (words.length > MAX_PHRASE_WORDS) return null;

  // A capitalised word that is not the first word, and not an ordinary opener,
  // is treated as a possible name and the whole phrase is dropped.
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i].replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!word) continue;
    const isCapitalised = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
    if (!isCapitalised) continue;
    if (i === 0 && SENTENCE_STARTERS.has(word.toLowerCase())) continue;
    if (i === 0 && word.length > 1 && word === word.toUpperCase()) return null;
    if (i > 0) return null;
  }

  // Digits can be a date, an age or a room number, any of which narrow a service.
  if (/\d/.test(trimmed)) return null;

  const phrase = trimmed.toLowerCase().replace(/[.!?]+$/, "");
  const meaningful = phrase.split(" ").filter(Boolean).length >= MIN_PHRASE_WORDS && phrase.length >= 8;
  return meaningful ? phrase : null;
}

function tally(records: PracticeRecord[]) {
  const map = new Map<string, { revisited: number; worthContinuing: number; services: Set<string> }>();
  for (const record of records) {
    if (record.outcome === "planned") continue; // A plan is not an outcome.
    const phrase = normalisePractice(record.text);
    const theme = record.theme.trim().toLowerCase();
    if (!phrase || !theme) continue;

    const key = `${theme}|${phrase}`;
    const entry = map.get(key) ?? { revisited: 0, worthContinuing: 0, services: new Set<string>() };
    entry.revisited += 1;
    if (record.outcome === "continue") entry.worthContinuing += 1;
    entry.services.add(record.serviceId);
    map.set(key, entry);
  }
  return map;
}

const toSignals = (map: ReturnType<typeof tally>): PracticeSignal[] =>
  [...map.entries()]
    .map(([key, value]) => {
      const [theme, phrase] = key.split("|");
      return { theme, phrase, revisited: value.revisited, worthContinuing: value.worthContinuing, services: value.services.size };
    })
    .sort((a, b) => b.worthContinuing - a.worthContinuing || b.revisited - a.revisited || a.phrase.localeCompare(b.phrase));

/**
 * One educator's own closed loops: things they came back to and kept.
 *
 * No sharing, no thresholds, no privacy question, and useful in the first week
 * rather than at scale. This is the half of the flywheel that pays for itself
 * immediately.
 */
export function buildOwnSignals(input: { records: PracticeRecord[]; theme?: string }): PracticeSignal[] {
  const filtered = input.theme
    ? input.records.filter((r) => r.theme.trim().toLowerCase() === input.theme!.trim().toLowerCase())
    : input.records;
  return toSignals(tally(filtered)).filter((signal) => signal.revisited >= MIN_TIMES_OWN);
}

/**
 * The same signal across services that opted in, suppressed until it is real.
 *
 * The service threshold is doing two jobs at once: it is what makes a signal
 * worth believing, and it is what makes an idiosyncratic phrase, including one
 * carrying a child's name, structurally unable to appear.
 */
export function buildSharedSignals(input: { records: PracticeRecord[]; theme?: string }): {
  signals: PracticeSignal[];
  suppressed: number;
} {
  const filtered = input.theme
    ? input.records.filter((r) => r.theme.trim().toLowerCase() === input.theme!.trim().toLowerCase())
    : input.records;
  const all = toSignals(tally(filtered));
  const signals = all.filter(
    (signal) => signal.services >= MIN_SERVICES_PER_SIGNAL && signal.revisited >= MIN_TIMES_PER_SIGNAL,
  );
  return { signals, suppressed: all.length - signals.length };
}

/**
 * How a signal describes itself, in words that survive contact with somebody
 * who knows what a correlation is.
 */
export function describeSignal(signal: PracticeSignal, mode: "own" | "shared"): string {
  if (mode === "own") {
    return signal.worthContinuing > 0
      ? `You came back to this ${signal.revisited} times and kept it going ${signal.worthContinuing}.`
      : `You have come back to this ${signal.revisited} times.`;
  }
  return `${signal.services} services tried this; it was marked worth continuing ${signal.worthContinuing} of ${signal.revisited} times.`;
}
