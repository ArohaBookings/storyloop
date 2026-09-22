/**
 * Wall cards: the learning behind a display, readable by anyone standing in
 * front of it, containing nothing about any child.
 *
 * A parent at pickup looks at a painting on the wall and has no idea what it
 * cost the child to make it. A small printed code next to it answers that. The
 * catch is that the code is on a wall in a building strangers walk through, so
 * whatever it opens must be safe in the hands of someone who should never have
 * had it.
 *
 * THE RULE THIS FILE ENFORCES: a wall card is about the EXPERIENCE, never about
 * a child. No names, no ages, no dates, no photos. Not redacted afterwards,
 * but structurally incapable of carrying them, because the last thing that
 * touches the text before a human approves it is the deterministic scrub below.
 *
 * Why deterministic and why last. A model may rewrite a story into experience
 * language first, and it is good at that. But a model cannot be the safety
 * boundary: it fails open, silently, on exactly the rare input nobody tested.
 * So the scrub runs AFTER any model output, it is pure, and it is tested. If
 * the model invents a name, the scrub removes it. If the model is unavailable,
 * the card still builds. The model is an improvement; this file is the promise.
 *
 * OVER-SCRUBBING IS ALWAYS THE RIGHT MISTAKE. A child named Grace costs us the
 * word "grace". That is a price worth paying every single time, and the report
 * tells the educator what went, so nothing is removed behind their back.
 *
 * Under NZ's Privacy Act 2020 a breach likely to cause serious harm must be
 * notified to the Privacy Commissioner and to the families affected. That is
 * the standard this file is written to.
 */

export type WallCardSource = {
  /** The story the educator chose, as they saved it. */
  storyText: string;
  /** What the story was about, in the educator's words. */
  title?: string | null;
  /** Curriculum links recorded on the story. */
  outcomes?: string[];
  /** Dispositions recorded on the story. */
  dispositions?: string[];
  /** Every name the service holds, so all of them can be removed, not just this child's. */
  knownNames: string[];
};

export type ScrubFinding = {
  /** What was taken out or noticed. */
  term: string;
  reason: "known-name" | "possessive" | "date" | "age" | "possible-name";
  /** Removed outright, or flagged for a human to look at. */
  action: "removed" | "flagged";
  count: number;
};

/**
 * What a stranger sees. This type exists so that the thing rendered publicly
 * has NOWHERE to put a name: the scrub report is deliberately not part of it.
 *
 * An earlier version returned one object carrying both the card and the list of
 * removed terms, which meant the child's name travelled inside the same value
 * that gets serialised to a public page. Nothing was leaking yet, but the only
 * thing standing between it and a leak was everybody remembering to strip a
 * field forever. Two types cost nothing and cannot be forgotten.
 */
export type PublicWallCard = {
  heading: string;
  /** What was happening here, in experience language. */
  body: string[];
  curriculum: string[];
  dispositions: string[];
  /** One thing a family could do with this at home. Never homework. */
  tryAtHome: string | null;
};

/** What the EDUCATOR sees before printing. Never served publicly. */
export type ScrubReport = {
  findings: ScrubFinding[];
  /** A card may only be published when this is true. */
  safe: boolean;
  /** Why it is not publishable, in the educator's words. */
  blockers: string[];
};

export type WallCardBuild = { card: PublicWallCard; report: ScrubReport };

/**
 * Words that begin a sentence or are ordinary capitalised English, so a
 * capital letter alone is not evidence of a name. Kept deliberately short:
 * anything not here is FLAGGED, not removed, and a human decides.
 */
const COMMON_CAPITALS = new Set([
  "A", "An", "And", "As", "At", "After", "Are", "Adult", "Adults",
  "But", "By", "Before", "Both",
  "Can", "Curriculum", "Children", "Child",
  "Do", "During",
  "Each", "Every", "Exploration", "EYLF",
  "Families", "Family", "For", "From",
  "He", "Her", "Here", "His", "How",
  "I", "If", "In", "It", "Its",
  "Later", "Learning",
  "Many", "More",
  "No", "Not", "Now",
  "On", "One", "Our", "Over",
  "She", "So", "Some", "Something",
  "That", "The", "Their", "Then", "There", "These", "They", "This", "Those", "To", "Today", "Together",
  "We", "What", "When", "Where", "Which", "While", "Who", "Why", "With",
  "You", "Your",
]);

/** Curriculum vocabulary that is capitalised and must survive the scrub. */
const CURRICULUM_TERMS = [
  "Te Whāriki", "Te Whariki", "Mana Aotūroa", "Mana Aoturoa", "Mana Reo", "Mana Tangata",
  "Mana Whenua", "Mana Atua", "EYLF", "NQS", "ACECQA", "ERO", "Exploration", "Communication",
  "Belonging", "Wellbeing", "Contribution", "Being", "Becoming",
];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Names are matched on their own, case-insensitively, including the possessive
 * and any macronised or hyphenated form. Word boundaries alone are not enough
 * for names with macrons, because \b does not treat ā as a word character in
 * every engine, so the boundary is written out explicitly.
 */
function namePattern(name: string) {
  const core = escape(name.trim());
  return new RegExp(`(^|[^\\p{L}\\p{N}'])(${core})(’s|'s|s’|s'|)(?![\\p{L}\\p{N}])`, "giu");
}

function countMatches(text: string, pattern: RegExp) {
  const matches = text.match(new RegExp(pattern.source, pattern.flags.replace("g", "") + "g"));
  return matches ? matches.length : 0;
}

/**
 * Remove every known name, every date, and every age from a piece of text, and
 * flag anything left that looks like it could identify somebody.
 */
export function scrub(text: string, knownNames: string[]): { text: string; findings: ScrubFinding[] } {
  const findings: ScrubFinding[] = [];
  let out = text;

  // 1. Known names, longest first so "Ana Maria" goes before "Ana".
  const names = [...new Set(knownNames.map((n) => n.trim()).filter((n) => n.length >= 2))]
    .sort((a, b) => b.length - a.length);
  for (const name of names) {
    // A name may be a full name; remove the parts too, since stories use first names.
    for (const part of [name, ...name.split(/\s+/)].filter((p) => p.length >= 2)) {
      const pattern = namePattern(part);
      const count = countMatches(out, pattern);
      if (!count) continue;
      out = out.replace(pattern, (_m, before: string, _matched: string, possessive: string) =>
        `${before}${possessive ? "the child's" : "the child"}`);
      findings.push({ term: part, reason: "known-name", action: "removed", count });
    }
  }

  // 2. Dates and ages: a date plus a room pins a child far more tightly than a name.
  const datePatterns: Array<[RegExp, ScrubFinding["reason"]]> = [
    [/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "date"],
    [/\b\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi, "date"],
    [/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/gi, "date"],
    [/\b\d{1,2}\s*(years?|yrs?)\s*(and\s*\d{1,2}\s*months?\s*)?old\b/gi, "age"],
    [/\b(aged|age)\s*\d{1,2}\b/gi, "age"],
    [/\b\d{1,2}\s*months?\s*old\b/gi, "age"],
  ];
  for (const [pattern, reason] of datePatterns) {
    const found = out.match(pattern);
    if (!found) continue;
    findings.push({ term: found[0], reason, action: "removed", count: found.length });
    out = out.replace(pattern, reason === "age" ? "this age group" : "recently");
  }

  // 3. Anything else that looks like a name: capitalised, mid-sentence, not
  //    ordinary English and not curriculum vocabulary. FLAGGED for a human,
  //    never removed silently, because guessing here would mangle real words.
  const protectedTerms = new Set(CURRICULUM_TERMS.flatMap((t) => t.split(/\s+/)));
  const sentences = out.split(/(?<=[.!?])\s+/);
  const suspicious = new Map<string, number>();
  for (const sentence of sentences) {
    const words = sentence.match(/[\p{Lu}][\p{L}'’-]+/gu) ?? [];
    words.forEach((word, index) => {
      const isFirstWord = index === 0 && sentence.trimStart().startsWith(word);
      if (isFirstWord) return;
      if (COMMON_CAPITALS.has(word) || protectedTerms.has(word)) return;
      suspicious.set(word, (suspicious.get(word) ?? 0) + 1);
    });
  }
  for (const [term, count] of suspicious) {
    findings.push({ term, reason: "possible-name", action: "flagged", count });
  }

  // 4. Gendered pronouns go too.
  //
  //    On its own "she" identifies nobody. But this page's whole promise is
  //    that if the link leaks, is posted or is passed around, it describes no
  //    individual at all, and a card that removes the name while leaving the
  //    gender keeps narrowing the field for anyone who already knows the room.
  //    Learning stories are written in the past tense almost without exception,
  //    which is why this stays readable: "she kept trying" becomes "they kept
  //    trying" with nothing else to fix.
  const OBJECT_CUES = "to|for|with|at|beside|of|from|behind|near|gave|told|asked|showed|helped|joined|passed|handed";
  out = out
    .replace(new RegExp(`\\b(${OBJECT_CUES})\\s+(her|him)\\b`, "gi"), (_m, cue: string) => `${cue} them`)
    .replace(/\b(she|he)\b/g, "they")
    .replace(/\b(She|He)\b/g, "They")
    .replace(/\b(her|his)\b/g, "their")
    .replace(/\b(Her|His)\b/g, "Their")
    .replace(/\b(hers|him)\b/g, "theirs")
    .replace(/\b(herself|himself)\b/gi, "themselves");

  // The agreement that "they" then needs. Only the auxiliaries, because those
  // are the ones that actually appear and the ones that read as broken.
  out = out
    .replace(/\bthey was\b/gi, (m) => (m[0] === "T" ? "They were" : "they were"))
    .replace(/\bthey is\b/gi, (m) => (m[0] === "T" ? "They are" : "they are"))
    .replace(/\bthey has\b/gi, (m) => (m[0] === "T" ? "They have" : "they have"))
    .replace(/\bthey does\b/gi, (m) => (m[0] === "T" ? "They do" : "they do"))
    .replace(/\bthey wasn't\b/gi, (m) => (m[0] === "T" ? "They weren't" : "they weren't"))
    .replace(/\bthey isn't\b/gi, (m) => (m[0] === "T" ? "They aren't" : "they aren't"))
    .replace(/\bthey doesn't\b/gi, (m) => (m[0] === "T" ? "They don't" : "they don't"));

  // Tidy the seams left by substitution.
  out = out
    .replace(/\bthe child the child\b/gi, "the child")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  // 5. Repair capitalisation LAST. Substituting a name at the start of a
  //    sentence leaves "worked. the child watched", which on something printed
  //    and stuck to a wall reads as carelessness, and carelessness is the exact
  //    impression this feature cannot afford to give.
  out = out
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, before: string, letter: string) => `${before}${letter.toUpperCase()}`)
    .trim();

  return { text: out, findings };
}

/** Sentences that are about a named child rather than the experience. */
const MAX_BODY_SENTENCES = 5;

/**
 * Build the card. Everything shown comes from the story the educator saved,
 * put through the scrub. Nothing is invented here.
 */
const NEUTRAL_HEADING = "What was happening here";

export function buildWallCard(source: WallCardSource): WallCardBuild {
  // A title that needed scrubbing is not worth salvaging: "the child's Learning
  // Story" reads like a mistake on a wall. Fall back to the neutral heading.
  const rawTitle = String(source.title ?? "").trim();
  const scrubbedTitle = scrub(rawTitle || NEUTRAL_HEADING, source.knownNames);
  const heading = !rawTitle || scrubbedTitle.text !== rawTitle ? NEUTRAL_HEADING : scrubbedTitle.text;

  // Take the narrative part of the story, drop the headings the app adds.
  const paragraphs = source.storyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^(learning story|what learning|curriculum|te whāriki|te whariki|eylf|where to next|family|whānau|whanau)/i.test(p))
    .filter((p) => p.split(/\s+/).length > 6);

  const cleanedParagraphs: string[] = [];
  const findings: ScrubFinding[] = [];
  for (const paragraph of paragraphs) {
    const result = scrub(paragraph, source.knownNames);
    cleanedParagraphs.push(result.text);
    findings.push(...result.findings);
  }

  const sentences = cleanedParagraphs
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, MAX_BODY_SENTENCES);

  const body = sentences.length ? [sentences.join(" ")] : [];

  const merged = new Map<string, ScrubFinding>();
  for (const finding of findings) {
    const key = `${finding.term}|${finding.reason}`;
    const existing = merged.get(key);
    if (existing) existing.count += finding.count;
    else merged.set(key, { ...finding });
  }

  const allFindings = [...merged.values()].sort((a, b) => b.count - a.count);

  const blockers: string[] = [];
  const flagged = allFindings.filter((f) => f.action === "flagged");
  if (flagged.length) {
    blockers.push(`Check these first, they may be names: ${flagged.map((f) => f.term).join(", ")}.`);
  }
  // No roster means the scrub had nothing to compare against, so its silence
  // proves nothing. Refusing to vouch for it is the honest answer.
  if (!source.knownNames.some((name) => name.trim().length >= 2)) {
    blockers.push("No child profiles are on this account, so names could not be checked against your own roster.");
  }
  if (!body.length) blockers.push("There is not enough of the story left to put on a wall.");

  return {
    card: {
      heading,
      body,
      curriculum: [...new Set((source.outcomes ?? []).map((o) => o.trim()).filter(Boolean))].slice(0, 6),
      dispositions: [...new Set((source.dispositions ?? []).map((d) => d.trim()).filter(Boolean))].slice(0, 4),
      tryAtHome: null,
    },
    // A card carrying an unexplained capitalised word is not publishable until
    // a human has looked at it. That is the point of the human gate.
    report: { findings: allFindings, safe: blockers.length === 0, blockers },
  };
}

/**
 * The printed code.
 *
 * Read aloud, typed by a grandparent, and printed next to a QR square. The
 * alphabet drops I, L, O, 0 and 1 because a code on a wall gets read by people
 * in a hurry and mistaking one for the other is the difference between "this
 * does not work" and a parent walking away.
 *
 * Ten characters from a 31-letter alphabet is about 8 x 10^14 codes, so
 * guessing one is not a route in, and the partial index on `code` means a
 * lookup is one indexed hit whether there are ten cards or ten million.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const WALL_CODE_LENGTH = 10;

export function generateWallCode(random: () => number = Math.random) {
  let out = "";
  for (let i = 0; i < WALL_CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function isWallCode(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^[${CODE_ALPHABET}]{${WALL_CODE_LENGTH}}$`).test(value.toUpperCase());
}

/** Grouped for printing, so the eye can carry it from paper to keyboard. */
export function formatWallCode(code: string) {
  return code.toUpperCase().replace(/(.{5})(?=.)/g, "$1 ");
}

/**
 * What goes under the QR square, in words a person can read.
 *
 * The real attack on a code stuck to a wall is not the link, it is somebody
 * replacing the sticker. A QR square is unreadable to a human, so a swap is
 * invisible unless the destination is also printed in plain text beside it.
 * This is the anti-swap line, and it is why it is never optional.
 */
export function wallCardUrl(code: string, origin = "https://storyloop.space") {
  return `${origin.replace(/\/$/, "")}/w/${code.toUpperCase()}`;
}
