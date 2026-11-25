import { SECTION_HEADINGS } from "@/components/app/StoryText";

/**
 * Where each line came from (25 Nov 2026, A4, switch LEADER_SOURCES_ON).
 *
 * StoryLoop holds the educator's note beside the draft, so it can show which
 * note line each sentence of the observation came from, and which sentences
 * the note does not show. This is that matcher: pure, deterministic, no model
 * call, nothing stored. It runs in the browser on the note and the text the
 * page already has.
 *
 *   note ──► units (lines, then sentences) numbered 1..n
 *   text ──► sections by the story's own headings ──► sentences
 *   observation sentence ──► shared content words with each unit ──► up to 2 sources
 *     no source + a quote the note does not hold ──► "not in your note"
 *     no source + the educator's own reading ("was learning", "showed") ──► reading
 *   reading sections (learning, links, next steps, whānau) ──► never judged
 *
 * The thresholds are constants, set on the tune half of the invented fixtures
 * in tests/fixtures/source-lines and frozen before the held-out half was run
 * (tests/source-lines-accuracy.test.ts). Words a person reads say "not in your
 * note", never "wrong" or "made up".
 */

export type SourceStatus = "backed" | "unbacked" | "reading";
export type SourceSentence = { text: string; status: SourceStatus; sources: number[] };
export type SourceBlock =
  | { type: "title"; text: string }
  | { type: "heading"; text: string }
  | { type: "para"; observation: boolean; sentences: SourceSentence[] };
export type SourceResult = { units: string[]; blocks: SourceBlock[] };

/** A unit is a source when this share of the sentence's content words is in it. */
export const MIN_SCORE = 0.34;
/** ...and at least this many content words are shared. */
export const MIN_SHARED = 2;
/** A sentence of this many content words or fewer may be backed by one shared word at MIN_SHORT_SCORE. */
export const SHORT_SENTENCE = 2;
export const MIN_SHORT_SCORE = 0.5;
/** At most this many note lines are named for one sentence. */
export const MAX_SOURCES = 2;
/** A second note line is named only when it backs the sentence nearly as well as the best one. */
export const SECOND_SOURCE_SHARE = 0.75;

const OBSERVATION_HEADING = "learning story";

const STOPWORDS = new Set(
  (
    "a an the and or but nor so yet to of in on at for with from by up down out into onto over off under about as than " +
    "is was were be been being are am has have had do did does done can could would will shall should may might must " +
    "i me my mine we us our ours you your yours he him his she her hers it its they them their theirs " +
    "this that these those there here then now next first later again also too very really just still even " +
    "what when where who whom which why how while after before until because if not no yes " +
    "all some each every both any many much more most own herself himself itself themselves ourselves myself " +
    "use used using uses go goes went going gone get gets got getting come came coming " +
    "today child children teacher teachers time way thing things something lot lots bit around along back " +
    "s t ll ve re d m"
  ).split(" "),
);

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17",
  eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40", fifty: "50", hundred: "100",
};

/** Words educators and drafts swap for each other. Kept short on purpose. */
const SAME_WORD: Record<string, string> = {
  said: "say", says: "say", saying: "say", told: "say", tells: "say", tell: "say", telling: "say",
  explained: "say", explains: "say", exclaimed: "say", called: "say", calls: "say", replied: "say",
  mum: "mother", mom: "mother", mummy: "mother", mama: "mother", dad: "father", daddy: "father", papa: "father",
  kids: "child", kid: "child", tummy: "stomach", belly: "stomach",
  biggest: "big", bigger: "big", smallest: "small", smaller: "small", little: "small",
  grabbed: "take", took: "take", takes: "take", taking: "take",
};

/** Lowercase, no accents (so whānau matches whanau), straight quotes. */
export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase();
}

function stem(word: string) {
  let w = word;
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ied")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && /(?:sh|ch|x|ss|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) w = w.slice(0, -1);
  else if (w.length > 5 && w.endsWith("ly")) w = w.slice(0, -2);
  if (w.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** The content words of a piece of text, as a set, with the child's first name taken out. */
export function contentWords(text: string, childName = "") {
  const name = fold(childName).trim().split(/\s+/)[0] ?? "";
  const out = new Set<string>();
  for (const raw of fold(text).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []) {
    const word = raw.replace(/'s$/, "").replace(/'/g, "");
    if (!word || STOPWORDS.has(word) || (name && word === name)) continue;
    const mapped = NUMBER_WORDS[word] ?? SAME_WORD[word] ?? word;
    if (STOPWORDS.has(mapped)) continue;
    out.add(/^\d+$/.test(mapped) ? mapped : stem(mapped));
  }
  return out;
}

/**
 * Sentences of one line or paragraph. A sentence ends at . ! or ? (and any
 * closing quote) followed by a space and a capital, a digit or an opening
 * quote, so "Look, pink!" he said. stays one sentence.
 */
export function splitSentences(text: string) {
  const parts = text.trim().split(/(?<=[.!?]["'”’)]*)\s+(?=["“(]?[\p{Lu}\d])/u).map((part) => part.trim()).filter(Boolean);
  // A piece that is only a quote ("Too much!") belongs with what follows it ("Tane laughed.").
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (/^["“][^"“”]*["”]$/.test(parts[i]) && i + 1 < parts.length) {
      parts[i + 1] = `${parts[i]} ${parts[i + 1]}`;
      continue;
    }
    out.push(parts[i]);
  }
  return out;
}

/** The note as numbered units: each line, and each sentence of a line. */
export function noteUnits(note: string) {
  return note
    .split(/\r?\n/)
    .flatMap((line) => splitSentences(line.replace(/^\s*[-*•]\s*/, "")))
    .filter((unit) => /[\p{L}\d]/u.test(unit));
}

function quotedSpans(sentence: string) {
  const spans: string[] = [];
  for (const match of fold(sentence).matchAll(/"([^"]+)"/g)) {
    const words = match[1].replace(/[^a-z0-9' ]+/g, " ").replace(/'/g, "").split(/\s+/).filter(Boolean);
    if (words.length >= 2) spans.push(words.join(" "));
  }
  return spans;
}

function flatWords(text: string) {
  return ` ${fold(text).replace(/'/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
}

// The educator's reading said inside the observation: what the child was
// learning or showing, not what happened. Only consulted when no note line
// backs the sentence.
const READING_CUE = new RegExp(
  [
    "\\b(?:was|were|is|are|been) (?:learning|building|developing|becoming|growing|beginning|starting|exploring|practi[sc]ing|discovering|forming|making|thinking|noticing|showing|testing|solving|using|bringing|leading|expressing|enjoying|learning to|showing)\\b",
    "\\bshow(?:ed|s|ing)? (?:real|great|such|how|us|that|what)\\b",
    "\\b(?:this|that|it) (?:was|is|tells|told|showed|shows|suggests|helped)\\b",
    "\\b(?:tells|told) us\\b",
    "\\bletting us know\\b",
    "\\ba (?:sign|lovely|great|wonderful|big|real)\\b",
    "\\b(?:confidence|curiosity|resilience|persistence|independence|courage|kindness|manaakitanga|wellbeing|theory|theories|skills?|understanding|knowledge|strategies)\\b",
    "\\bis (?:proud|curious|capable|confident|independent)\\b",
  ].join("|"),
  "i",
);

/** Match one observation sentence against the note units. Pure. */
export function matchSentence(sentence: string, unitWords: Set<string>[], note: string, childName = ""): SourceSentence {
  const words = contentWords(sentence, childName);
  const quotes = quotedSpans(sentence);
  const noteFlat = flatWords(note);
  const quoteMissing = quotes.some((quote) => !noteFlat.includes(` ${quote} `));
  if (quoteMissing) return { text: sentence, status: "unbacked", sources: [] };

  const scored: { unit: number; shared: number; score: number }[] = [];
  if (words.size > 0) {
    unitWords.forEach((unit, index) => {
      let shared = 0;
      for (const word of words) if (unit.has(word)) shared += 1;
      const score = shared / words.size;
      const enough = (shared >= MIN_SHARED && score >= MIN_SCORE) || (words.size <= SHORT_SENTENCE && shared >= 1 && score >= MIN_SHORT_SCORE);
      if (enough) scored.push({ unit: index + 1, shared, score });
    });
  }
  scored.sort((a, b) => b.score - a.score || b.shared - a.shared || a.unit - b.unit);
  const best = scored[0]?.score ?? 0;
  const sources = scored.slice(0, MAX_SOURCES).filter((s, i) => i === 0 || s.score >= best * SECOND_SOURCE_SHARE).map((s) => s.unit).sort((a, b) => a - b);
  if (sources.length) return { text: sentence, status: "backed", sources };
  if (READING_CUE.test(sentence)) return { text: sentence, status: "reading", sources: [] };
  return { text: sentence, status: "unbacked", sources: [] };
}

function isHeading(line: string) {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.length <= 40 && SECTION_HEADINGS.has(trimmed.toLowerCase());
}

/**
 * A story or a statement's "What I saw", matched sentence by sentence.
 * Story: the part under "Learning Story" is the observation; the title and
 * every other section are shown as they are and never judged. A story with no
 * headings at all is treated as observation after its first line. Statement:
 * every sentence is observation. Pure and deterministic.
 */
export function matchSources(input: { note: string; text: string; kind: "story" | "statement"; childName?: string }): SourceResult {
  const units = noteUnits(input.note ?? "");
  const unitWords = units.map((unit) => contentWords(unit, input.childName));
  const match = (sentence: string) => matchSentence(sentence, unitWords, input.note ?? "", input.childName);
  const text = (input.text ?? "").replace(/\r\n/g, "\n");

  if (input.kind === "statement") {
    const sentences = splitSentences(text.replace(/\s*\n\s*/g, " ")).map(match);
    return { units, blocks: sentences.length ? [{ type: "para", observation: true, sentences }] : [] };
  }

  const lines = text.split("\n");
  const hasHeadings = lines.some(isHeading);
  const blocks: SourceBlock[] = [];
  let section: string | null = null;
  let titled = false;
  let paragraph: string[] = [];

  const flush = () => {
    const body = paragraph.join(" ").replace(/\s+/g, " ").trim();
    paragraph = [];
    if (!body) return;
    if (!titled) {
      titled = true;
      blocks.push({ type: "title", text: body });
      return;
    }
    const observation = hasHeadings ? section === OBSERVATION_HEADING : true;
    const sentences = splitSentences(body).map((sentence) => (observation ? match(sentence) : { text: sentence, status: "reading" as const, sources: [] }));
    blocks.push({ type: "para", observation, sentences });
  };

  for (const line of lines) {
    if (isHeading(line)) {
      flush();
      titled = true; // a story that starts with a heading has no title line
      section = line.trim().toLowerCase();
      blocks.push({ type: "heading", text: line.trim() });
    } else if (!line.trim()) {
      flush();
    } else if (!titled) {
      // The title is the first line on its own.
      paragraph.push(line);
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return { units, blocks };
}

/** Every observation sentence of a result, in order. */
export function observationSentences(result: SourceResult) {
  return result.blocks.flatMap((block) => (block.type === "para" && block.observation ? block.sentences : []));
}
