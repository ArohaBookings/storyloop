/**
 * Room mode (10 Nov 2026): talk through a whole session, up to fifteen minutes,
 * and get every word back as a transcript to check before anything is written.
 *
 * What it records is the educator talking, not the room. It is a long voice
 * note: she says what she saw, as she would tell a colleague. The sound is
 * turned into words and discarded; nothing is saved until she writes a story.
 *
 * What makes it safe to trust, all of it in this file so it can be tested:
 *  - A long recording is cut into pieces at a pause, so one lost upload costs
 *    under a minute, never the whole session, and the gap is marked where it
 *    happened instead of being papered over.
 *  - The children's first names are given to the transcriber, and a name that
 *    was heard almost-but-not-quite right is offered back as a one-tap fix.
 *  - Words the transcriber was unsure of are listed for the educator to check.
 *  - Nothing here writes or rewrites a word. The transcript is what was said.
 *    Splitting it by child and writing each story are the existing group and
 *    story steps, unchanged.
 *
 * Safe to import in the browser.
 */
export const ROOM_MAX_SECONDS = 15 * 60;
export const ROOM_SEGMENT_MIN_SECONDS = 40;
export const ROOM_SEGMENT_MAX_SECONDS = 70;
/** How long a pause must last before a piece is cut there. */
export const ROOM_QUIET_MS = 350;
export const ROOM_NAMES_MAX = 40;
/** Token log-probability below which a word is listed for checking (about a one in three chance of being right). */
export const ROOM_UNSURE_LOGPROB = -1.1;
export const ROOM_UNSURE_MAX = 12;
/** sessionStorage keys for handing the checked transcript to the group page or the story page. */
export const ROOM_HANDOFF_GROUP = "storyloop-room-group";
export const ROOM_HANDOFF_STORY = "storyloop-room-note";

/** Cut the current piece now? At the first pause after the minimum, or at the maximum regardless. */
export function shouldCutSegment(input: { secondsInSegment: number; quietMs: number }) {
  if (input.secondsInSegment >= ROOM_SEGMENT_MAX_SECONDS) return true;
  return input.secondsInSegment >= ROOM_SEGMENT_MIN_SECONDS && input.quietMs >= ROOM_QUIET_MS;
}

export type RoomSegment = { index: number; seconds: number; text?: string; failed?: boolean; unsure?: string[] };

export function missedMark(seconds: number) {
  const s = Math.max(1, Math.round(seconds));
  return `[missed about ${s} ${s === 1 ? "second" : "seconds"} here]`;
}

const MISSED = /\[missed about \d+ seconds? here\]/;

/** True while the transcript still carries a gap the educator has not dealt with. */
export function hasMissedMark(text: string) {
  return MISSED.test(text);
}

/** The pieces in the order they were spoken. A lost piece is marked where it was; a silent one adds nothing. */
export function roomTranscript(segments: RoomSegment[]) {
  return [...segments]
    .sort((a, b) => a.index - b.index)
    .map((segment) => (segment.failed ? missedMark(segment.seconds) : (segment.text ?? "").trim()))
    .filter(Boolean)
    .join("\n\n");
}

/** Every piece is either transcribed or marked as lost: nothing is still on its way. */
export function allSegmentsSettled(segments: RoomSegment[]) {
  return segments.every((segment) => segment.failed || typeof segment.text === "string");
}

/** First names only: letters, hyphens and apostrophes, once each, capped. */
export function cleanRoomNames(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const name = (item.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30);
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= ROOM_NAMES_MAX) break;
  }
  return out;
}

/** What the transcriber is told so it spells the children's names the way the educator does. */
export function namesHint(names: string[]) {
  const clean = cleanRoomNames(names);
  return clean.length ? ` Children's first names you may hear: ${clean.join(", ")}.` : "";
}

export function editDistance(a: string, b: string) {
  const s = a.toLowerCase(); const t = b.toLowerCase();
  if (s === t) return 0;
  const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const keep = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (s[i - 1] === t[j - 1] ? 0 : 1));
      last = keep;
    }
  }
  return prev[t.length];
}

// Capitalised words that open sentences and are not names. A word here is never offered as a misheard name.
const NOT_NAMES = new Set(
  ("the then they there this that these those when what where while with we he she her his it in on at as an a and but so or if i my our you your " +
    "after before later today yesterday tomorrow now next first second third finally also both each some all one two three four five mum dad nana " +
    "not no yes okay ok oh wow look more mine me can could would should did do does is are was were has have had will just still again once soon " +
    "here how why who to for from of by up down out over under than their them its be been let lets then monday tuesday wednesday thursday friday " +
    "saturday sunday january february march april june july august september october november december te whāriki eylf everyone everybody " +
    "someone nobody another other outside inside during because although until since").split(" "),
);

type Word = { text: string; at: number; sentenceStart: boolean };

function capitalisedWords(transcript: string): Word[] {
  const words: Word[] = [];
  const pattern = /\p{Lu}[\p{L}\p{M}'-]*/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(transcript))) {
    const before = transcript.slice(0, match.index).trimEnd();
    const sentenceStart = before.length === 0 || /[.!?:"“\]\n]$/.test(before) || /\n\s*$/.test(transcript.slice(0, match.index));
    words.push({ text: match[0].replace(/'s$/i, ""), at: match.index, sentenceStart });
  }
  return words;
}

export type NameChecks = {
  /** Children on today's list who were named, with how many times. */
  heard: Array<{ name: string; count: number }>;
  /** A word that is nearly one of today's names: probably misheard. */
  suggestions: Array<{ heard: string; suggest: string; count: number }>;
  /** Other names said mid-sentence that are not on today's list. */
  others: Array<{ name: string; count: number }>;
};

/**
 * Compare the names in the transcript with today's children. Pure, and it only
 * ever suggests: nothing is changed until the educator taps a fix.
 */
export function nameChecks(transcript: string, known: string[]): NameChecks {
  const names = cleanRoomNames(known);
  const byLower = new Map(names.map((name) => [name.toLowerCase(), name]));
  const heard = new Map<string, number>();
  const near = new Map<string, { heard: string; suggest: string; count: number }>();
  const others = new Map<string, number>();

  for (const word of capitalisedWords(transcript)) {
    const lower = word.text.toLowerCase();
    if (word.text.length < 2 || NOT_NAMES.has(lower)) continue;
    const exact = byLower.get(lower);
    if (exact) { heard.set(exact, (heard.get(exact) ?? 0) + 1); continue; }

    let best: { name: string; distance: number } | null = null;
    for (const name of names) {
      if (name[0].toLowerCase() !== lower[0] || Math.abs(name.length - word.text.length) > 2) continue;
      const distance = editDistance(name, word.text);
      const limit = Math.min(name.length, word.text.length) <= 3 ? 1 : 2;
      if (distance <= limit && (!best || distance < best.distance)) best = { name, distance };
    }
    if (best) {
      const key = `${lower}>${best.name.toLowerCase()}`;
      near.set(key, { heard: word.text, suggest: best.name, count: (near.get(key)?.count ?? 0) + 1 });
    } else if (!word.sentenceStart) {
      others.set(word.text, (others.get(word.text) ?? 0) + 1);
    }
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  return {
    heard: names.filter((name) => heard.has(name)).map((name) => ({ name, count: heard.get(name) ?? 0 })),
    suggestions: [...near.values()].sort(byCount),
    others: [...others.entries()].map(([name, count]) => ({ name, count })).sort(byCount).slice(0, 12),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace a misheard name wherever it stands as a whole word. Nothing else in the transcript moves. */
export function applyNameFix(transcript: string, heard: string, name: string) {
  if (!heard.trim() || !name.trim()) return transcript;
  return transcript.replace(new RegExp(`(^|[^\\p{L}\\p{M}])${escapeRegExp(heard)}(?![\\p{L}\\p{M}])`, "gu"), `$1${name}`);
}

type TokenLogprob = { token?: string; logprob?: number };

/**
 * The words the transcriber was least sure of, from its token probabilities.
 * A word is as doubtful as its most doubtful piece. Short words and anything
 * that is not a word are left out, and each word is listed once.
 */
export function unsureWords(logprobs: unknown, threshold = ROOM_UNSURE_LOGPROB): string[] {
  if (!Array.isArray(logprobs)) return [];
  const words: Array<{ text: string; worst: number }> = [];
  for (const item of logprobs as TokenLogprob[]) {
    if (!item || typeof item.token !== "string" || typeof item.logprob !== "number") continue;
    // Punctuation has its own doubts; they say nothing about the word before it.
    if (!/[\p{L}\p{N}]/u.test(item.token)) { if (/^\s/.test(item.token)) words.push({ text: "", worst: 0 }); continue; }
    const startsWord = /^\s/.test(item.token) || words.length === 0;
    if (startsWord) words.push({ text: item.token, worst: item.logprob });
    else {
      const current = words[words.length - 1];
      current.text += item.token;
      current.worst = Math.min(current.worst, item.logprob);
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    if (word.worst >= threshold) continue;
    const text = word.text.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (text.length < 3 || !/^[\p{L}\p{M}'-]+$/u.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= ROOM_UNSURE_MAX) break;
  }
  return out;
}

/** m:ss for the recording clock. */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
