/**
 * Transition statement and end-of-year summary drafts (19 Oct 2026).
 *
 * Why: in Term 4 the highest-intent visitors are kinder teachers writing
 * Victoria's TLDS (and NSW/QLD transition statements, and end-of-year
 * summaries) for a whole group, due by mid-December. They landed on the TLDS
 * guides, tapped "Start free", found a learning-story tool and left (14 and 19
 * Oct sessions; an independent visitor simulation ranked this the biggest
 * leak). This drafts the part of the job a tool can help with: for each of the
 * five outcomes, a strengths-based line about what the educator saw and a
 * strategy the next teacher can act on, written ONLY from the educator's notes.
 *
 * A separate path: the learning-story writer (generate.ts, prompts.ts) and
 * its output are untouched. Shared: the AI call, JSON parsing and the offline
 * switch for the local test stack.
 */
import { StoryWriterUnavailableError, callAI, offlineWriterAllowed, parseJSON } from "./generate";
import { runPrivacyGuardian, type PrivacyGuardianResult } from "@/lib/privacy-guardian";
import { aiFailureReason } from "@/lib/ai-health";

export type TransitionFramework = "VEYLDF" | "EYLF" | "QKLG" | "TW";
export type TransitionMode = "transition" | "summary";

export const TRANSITION_OUTCOMES: Record<TransitionFramework, readonly string[]> = {
  // Victoria's TLDS Section 1.1 uses the five VEYLDF outcomes by name.
  VEYLDF: ["Identity", "Community", "Wellbeing", "Learning", "Communication"],
  EYLF: [
    "Outcome 1: Identity",
    "Outcome 2: Community",
    "Outcome 3: Wellbeing",
    "Outcome 4: Learning",
    "Outcome 5: Communication",
  ],
  // Queensland's kindergarten transition statement summarises the five QKLG
  // learning and development areas (QCAA, checked 27 Oct 2026).
  QKLG: ["Identity", "Connectedness", "Wellbeing", "Active learning", "Communicating"],
  TW: [
    "Mana atua | Wellbeing",
    "Mana whenua | Belonging",
    "Mana tangata | Contribution",
    "Mana reo | Communication",
    "Mana aotūroa | Exploration",
  ],
};

export type TransitionOutcomeDraft = {
  outcome: string;
  /** What the educator's notes show, strengths-based. Empty when the notes show nothing for this outcome. */
  seen: string;
  /** For a transition: what the next teacher can do. For a summary: a next step. */
  strategy: string;
  /** When the notes show nothing: what to look for or add. Never a stretched link. */
  gap: string;
};

export type TransitionDraft = {
  framework: TransitionFramework;
  mode: TransitionMode;
  childName: string;
  outcomes: TransitionOutcomeDraft[];
  checks: string[];
  privacyGuardian: PrivacyGuardianResult;
  aiUnavailable?: string;
};

export const MIN_TRANSITION_NOTES = 80;
export const MAX_TRANSITION_NOTES = 3000;

const STATEMENT: Record<TransitionFramework, Record<TransitionMode, string>> = {
  VEYLDF: {
    transition: "Victoria's Transition Learning and Development Statement (TLDS), Section 1.1: the five VEYLDF outcomes, with intentional teaching strategies for the Foundation (Prep) teacher",
    summary: "an end-of-year learning summary against the five VEYLDF outcomes, with a next step for each",
  },
  EYLF: {
    transition: "a transition to school statement (for example NSW or Queensland) against the five EYLF V2.0 learning outcomes, with strategies for the school teacher",
    summary: "an end-of-year learning summary against the five EYLF V2.0 learning outcomes, with a next step for each",
  },
  QKLG: {
    transition: "Queensland's kindergarten transition statement: a strengths-based, point-in-time summary across the five QKLG learning and development areas, with suggestions for continuity the Prep teacher can act on",
    summary: "an end-of-year learning summary against the five QKLG learning and development areas, with a next step for each",
  },
  TW: {
    transition: "a transition to school summary against the five Te Whāriki strands, with strategies for the new entrant teacher",
    summary: "an end-of-year learning summary against the five Te Whāriki strands, with a next step for each",
  },
};

export const TRANSITION_SYSTEM_PROMPT = `You help early childhood educators in Australia and Aotearoa New Zealand draft outcome descriptions and teaching strategies for one child: a transition to school statement (such as Victoria's TLDS Section 1.1) or an end-of-year learning summary.

You are given the educator's own notes about ONE child. Write only from those notes.

Hard rules:
- Never invent anything. No events, places, people, objects, quotes, feelings, abilities, interests or family details that are not in the notes.
- Child's words: quote only words that appear in the notes, exactly as written, inside double quotation marks. Otherwise paraphrase without quotation marks.
- Strengths-based. Describe what the child does and what helps them. No comparisons with other children. No deficit labels such as "can't", "struggles", "behind" or "poor". No diagnosis or diagnosis-like words (for example ADHD, autism, delay, disorder, anxiety) unless the notes say the family has shared a diagnosis, and then only as "the family has shared...".
- If the notes show nothing for an outcome, leave "seen" and "strategy" as empty strings and write "gap": one sentence on what to look for or which documented moment to add. Do not stretch a weak link to fill an outcome.
- "seen": one or two sentences, third person, using the child's first name only (never a surname, and never other children's full names), saying what the educator observed and what it shows.
- "strategy": for a transition statement, one or two sentences a Foundation/Prep or new entrant teacher can act on in the first weeks, built on what worked in the notes. For an end-of-year summary, one sentence on a next step for the coming term. Specific to this child, never generic advice that would suit any child.
- Australian / New Zealand English spelling. Plain, warm, professional. No em dashes.

Return JSON only, in this shape, with exactly the outcomes listed in the request, in that order:
{"outcomes":[{"outcome":"<name>","seen":"...","strategy":"...","gap":""}],"checks":["..."]}
"checks": one to three short things the educator must confirm before using the draft (a detail to verify, or something that needs the family's agreement).`;

export function buildTransitionUserMessage(params: {
  notes: string;
  childName: string;
  framework: TransitionFramework;
  mode: TransitionMode;
}) {
  return [
    `Statement: ${STATEMENT[params.framework][params.mode]}.`,
    `Outcomes, in this order: ${TRANSITION_OUTCOMES[params.framework].join("; ")}.`,
    `Child's first name: ${params.childName || "use the first name the notes use, never a surname"}.`,
    "Educator's notes:",
    '"""',
    params.notes,
    '"""',
  ].join("\n");
}

// Labels the educator never wrote, and deficit wording. Flagged, never silently kept.
const LABEL_WORDS = /\b(adhd|autis\w*|asd|odd|spd|delay\w*|disorder\w*|diagnos\w*|anxiety|anxious|neurodiverg\w*|dyspraxi\w*|dyslexi\w*|on the spectrum|sensory processing)\b/gi;
const DEFICIT_WORDS = /\b(struggl\w*|behind (?:his|her|their) peers|can'?t|poor)\b/gi;

const clean = (value: unknown, max = 420) =>
  (typeof value === "string" ? value : "")
    // Em dashes only: an en dash in "20–25 minutes" or "3–4 years" is a range.
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const normaliseForMatch = (text: string) =>
  fold(text).replace(/[“”"‘’'`«»]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// "…", “…”, «…», and ‘…’ / '…' when they open and close at word edges (so the
// apostrophe in "Arlo's" or "can't" is never taken for a quotation mark).
const DOUBLE_QUOTE = /[“"«]([^“”"«»]{2,420})[”"»]/g;
const SINGLE_QUOTE = /(^|[\s(\[])[‘']((?:[^‘’']|(?<=\w)['’](?=\w)){2,420}?)[’'](?=$|[\s.,;:!?)\]])/g;

/**
 * Keeps only quotations that are really in the notes, as whole words. A quote
 * the notes do not contain loses its quotation marks and becomes a check for
 * the educator.
 */
export function guardQuotes(text: string, notes: string, checks: Set<string>): string {
  const haystack = ` ${normaliseForMatch(notes)} `;
  const inNotes = (inner: string) => {
    const needle = normaliseForMatch(inner);
    return Boolean(needle) && haystack.includes(` ${needle} `);
  };
  const flag = (inner: string) =>
    checks.add(`Check "${inner.slice(0, 60)}": those words are not in your notes, so they are not shown as a quote.`);
  return text
    .replace(DOUBLE_QUOTE, (_whole, inner: string) => {
      if (inNotes(inner)) return `"${inner}"`;
      flag(inner);
      return inner;
    })
    .replace(SINGLE_QUOTE, (_whole, before: string, inner: string) => {
      if (inNotes(inner)) return `${before}"${inner}"`;
      flag(inner);
      return `${before}${inner}`;
    });
}

export function guardDiagnosisWords(text: string, notes: string, checks: Set<string>) {
  const inNotes = (word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(notes);
  for (const match of text.match(LABEL_WORDS) ?? []) {
    if (!inNotes(match)) checks.add(`Remove "${match}": it is not in your notes, and a transition statement is not the place for labels.`);
  }
  for (const match of text.match(DEFICIT_WORDS) ?? []) {
    if (!inNotes(match)) checks.add(`Reword "${match}": describe what the child does and what helps, rather than what they can't do.`);
  }
}

// What each outcome may be called in a reply, so a reordered or missing row
// never puts one outcome's words under another's heading.
const OUTCOME_TOKENS: Record<TransitionFramework, string[][]> = {
  VEYLDF: [["identity"], ["community", "connected", "contribute"], ["wellbeing"], ["learning", "learner"], ["communicat"]],
  EYLF: [["identity", "outcome 1"], ["community", "connected", "contribute", "outcome 2"], ["wellbeing", "outcome 3"], ["learning", "learner", "outcome 4"], ["communicat", "outcome 5"]],
  QKLG: [["identity"], ["connected", "community"], ["wellbeing"], ["active learning", "learning", "learner"], ["communicat"]],
  TW: [["wellbeing", "mana atua"], ["belonging", "mana whenua"], ["contribution", "mana tangata"], ["communicat", "mana reo"], ["exploration", "mana aoturoa"]],
};

export function normaliseTransitionDraft(
  raw: { outcomes?: unknown; checks?: unknown } | null | undefined,
  params: { notes: string; childName: string; framework: TransitionFramework; mode: TransitionMode },
): Omit<TransitionDraft, "privacyGuardian"> {
  const names = TRANSITION_OUTCOMES[params.framework];
  const rows = Array.isArray(raw?.outcomes) ? (raw!.outcomes as Array<Record<string, unknown>>) : [];
  const checks = new Set<string>();
  const used = new Set<number>();
  const tokens = OUTCOME_TOKENS[params.framework];
  const labelOf = (row: Record<string, unknown> | undefined) => (typeof row?.outcome === "string" ? fold(row.outcome) : "");
  const matches = (row: Record<string, unknown> | undefined, index: number) => tokens[index].some((t) => labelOf(row).includes(t));
  const outcomes = names.map((name, index) => {
    // The row in this position, if it is unlabelled or labelled as this
    // outcome; otherwise the row labelled as this outcome; otherwise nothing.
    // A row is never used twice.
    let at = -1;
    if (rows[index] && !used.has(index) && (!labelOf(rows[index]) || matches(rows[index], index))) at = index;
    else at = rows.findIndex((r, i) => !used.has(i) && matches(r, index));
    if (at >= 0) used.add(at);
    const row: Record<string, unknown> = at >= 0 ? rows[at] ?? {} : {};
    const seen = guardQuotes(clean(row.seen), params.notes, checks);
    let strategy = guardQuotes(clean(row.strategy), params.notes, checks);
    let gap = clean(row.gap, 300);
    guardDiagnosisWords(`${seen} ${strategy}`, params.notes, checks);
    if (!seen) strategy = "";
    if (!seen && !gap) gap = "Your notes do not show this yet. Add a dated moment from your documentation before you write this part.";
    if (seen) gap = "";
    return { outcome: name, seen, strategy, gap };
  });
  for (const check of Array.isArray(raw?.checks) ? (raw!.checks as unknown[]) : []) {
    const text = clean(check, 240);
    if (text) checks.add(text);
  }
  return {
    framework: params.framework,
    mode: params.mode,
    childName: params.childName,
    outcomes,
    checks: Array.from(checks).slice(0, 6),
  };
}

/** The local test stack only (no AI key, no spend): a plain draft built from the notes. */
function offlineTransitionDraft(params: { notes: string; childName: string; framework: TransitionFramework; mode: TransitionMode }) {
  const name = params.childName || "The child";
  const first = params.notes.split(/(?<=[.!?])\s+/)[0]?.trim() ?? params.notes.trim();
  const names = TRANSITION_OUTCOMES[params.framework];
  return normaliseTransitionDraft(
    {
      outcomes: names.map((outcome, i) =>
        i === 3
          ? { outcome, seen: `${first}`, strategy: `Give ${name} time with open materials and ask what they will try next.`, gap: "" }
          : { outcome, seen: "", strategy: "", gap: "" },
      ),
      checks: ["Check every line against your own documentation before you use it."],
    },
    params,
  );
}

export async function generateTransitionDraft(params: {
  notes: string;
  childName: string;
  framework: TransitionFramework;
  mode: TransitionMode;
}): Promise<TransitionDraft> {
  const notes = params.notes
    .slice(0, MAX_TRANSITION_NOTES)
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "");
  const input = { ...params, notes };
  try {
    const raw = parseJSON<{ outcomes?: unknown; checks?: unknown }>(
      // 30 s, so a fallback provider still fits inside the route's 60 s.
      await callAI(TRANSITION_SYSTEM_PROMPT, buildTransitionUserMessage(input), { timeoutMs: 30_000 }),
    );
    const draft = normaliseTransitionDraft(raw, input);
    const text = draft.outcomes.map((o) => `${o.seen} ${o.strategy}`).join("\n");
    return { ...draft, privacyGuardian: runPrivacyGuardian({ observation: notes, story: text }) };
  } catch (error) {
    if (!offlineWriterAllowed()) {
      // The reason only: a parse error's message can quote model output, which may name the child.
      console.error("Transition draft failed, AI unavailable:", aiFailureReason(error));
      throw new StoryWriterUnavailableError(aiFailureReason(error), error);
    }
    const draft = offlineTransitionDraft(input);
    const text = draft.outcomes.map((o) => `${o.seen} ${o.strategy}`).join("\n");
    return { ...draft, privacyGuardian: runPrivacyGuardian({ observation: notes, story: text }), aiUnavailable: aiFailureReason(error) };
  }
}
