import OpenAI from "openai";

/**
 * One moment, many children: split a note about a group into what it says
 * about each child, so each child gets their own story.
 *
 * The rule that makes this safe: the split never writes a word. Every fragment
 * is copied from the note, and anything the model returns that is not found in
 * the note, character for character (allowing only for spacing and quote
 * style), is thrown away here in code. The worst a bad split can do is leave
 * something out, which the educator sees and fixes on the review screen before
 * any story is written. Each child's story is then written by the normal story
 * pipeline, unchanged, from that child's part of the note.
 *
 * If the model is unavailable, a rule-based split does the same job by
 * sentence: a sentence naming a child is theirs, a sentence naming nobody on
 * the list is shared context.
 */

const MODEL = process.env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5.4-mini";

export type GroupSplit = {
  children: Array<{ name: string; fragments: string[] }>;
  shared: string[];
  source: "ai" | "rules";
};

function normaliseSpace(text: string) {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

/** Where a fragment sits in the note, or -1 if it is not in the note. Pure. */
export function positionInNote(note: string, fragment: string): number {
  const haystack = normaliseSpace(note);
  const needle = normaliseSpace(fragment).replace(/^[\s,;:.-]+|[\s,;]+$/g, "");
  if (needle.length < 3) return -1;
  return haystack.indexOf(needle);
}

/** Keep only fragments that are really in the note, once each, in note order. Pure. */
export function verbatimFragments(note: string, candidates: unknown): string[] {
  if (!Array.isArray(candidates)) return [];
  const seen = new Set<string>();
  const kept: Array<{ text: string; at: number }> = [];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const at = positionInNote(note, candidate);
    if (at < 0) continue;
    const text = normaliseSpace(candidate).replace(/^[\s,;:.-]+|[\s,;]+$/g, "");
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({ text, at });
  }
  return kept.sort((a, b) => a.at - b.at).map((item) => item.text);
}

/** Sentences of a note, split on end punctuation and line breaks. Pure. */
export function noteSentences(note: string): string[] {
  return note
    // A sentence can end with a closing quote: 'she called out "Look!" Harvey came'.
    .split(/(?<=[.!?][”’"')]?)\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function mentions(sentence: string, name: string) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(sentence);
}

/** The rule-based split. Pure. */
export function ruleSplit(note: string, names: string[]): GroupSplit {
  const sentences = noteSentences(note);
  const children = names.map((name) => ({ name, fragments: sentences.filter((sentence) => mentions(sentence, name)) }));
  const shared = sentences.filter((sentence) => !names.some((name) => mentions(sentence, name)));
  return { children, shared, source: "rules" };
}

/** Sentences of the note with where each starts and ends, in the normalised text. Pure. */
function sentenceSpans(note: string) {
  const text = normaliseSpace(note);
  const spans: Array<{ text: string; start: number; end: number }> = [];
  let cursor = 0;
  for (const sentence of noteSentences(text)) {
    const start = text.indexOf(sentence, cursor);
    if (start < 0) continue;
    spans.push({ text: sentence, start, end: start + sentence.length });
    cursor = start + sentence.length;
  }
  return spans;
}

/**
 * The whole sentences of the note that the fragments sit in, in note order.
 * Working in whole sentences keeps every word the educator's own and every
 * piece grammatical, and means a clause can never appear twice. Pure.
 */
export function sentencesFor(note: string, fragments: string[]): string[] {
  const spans = sentenceSpans(note);
  const chosen = new Set<number>();
  for (const fragment of fragments) {
    const at = positionInNote(note, fragment);
    if (at < 0) continue;
    const end = at + normaliseSpace(fragment).replace(/^[\s,;:.-]+|[\s,;]+$/g, "").length;
    spans.forEach((span, index) => {
      if (span.start < end && at < span.end) chosen.add(index);
    });
  }
  return [...chosen].sort((a, b) => a - b).map((index) => spans[index].text);
}

/**
 * One child's note: the sentences about them plus the shared scene-setting
 * sentences, in the order they appear in the original note. Every word is the
 * educator's. Pure.
 */
export function childNote(note: string, split: GroupSplit, name: string): string {
  const child = split.children.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (!child || child.fragments.length === 0) return "";
  return sentencesFor(note, [...child.fragments, ...split.shared]).join(" ");
}

const PROMPT = `You split an early childhood educator's note about a group moment into what it says about each named child.

You never write new words. Every fragment you return must be copied exactly, character for character, from the note: a whole sentence, or a clause of one. Do not fix spelling, do not change pronouns, do not summarise.

For each child in the list, return the fragments that describe what that child did or said, including sentences that refer to them only by "she", "he" or "they" when it is clear from the note that it means them. A fragment that describes several children belongs to each of them.
Return as "shared" the fragments that set the scene for everyone (the place, the activity, the materials) without being about one child.
If the note says nothing about a child, return an empty list for them. Never guess.

Return JSON only: {"children":[{"name":"...","fragments":["..."]}],"shared":["..."]}`;

export async function splitGroupNote(note: string, names: string[]): Promise<GroupSplit> {
  const clean = note.slice(0, 3000);
  const list = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 8);
  if (!process.env.OPENAI_API_KEY || list.length === 0) return ruleSplit(clean, list);
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 });
    const reasoning = /^(gpt-5|o\d)/i.test(MODEL);
    const response = await client.chat.completions.create({
      model: MODEL,
      ...(reasoning ? { max_completion_tokens: 2400, reasoning_effort: "low" } : { max_tokens: 2400, temperature: 0 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: `Children: ${list.join(", ")}\n\nNOTE:\n${clean}` },
      ],
    } as Parameters<typeof client.chat.completions.create>[0]);
    const content = "choices" in response ? response.choices[0]?.message?.content ?? "" : "";
    const parsed = JSON.parse(content) as { children?: Array<{ name?: unknown; fragments?: unknown }>; shared?: unknown };
    const children = list.map((name) => {
      const match = (parsed.children ?? []).find((entry) => typeof entry.name === "string" && entry.name.trim().toLowerCase() === name.toLowerCase());
      return { name, fragments: verbatimFragments(clean, match?.fragments) };
    });
    // A split that found nothing for anyone is worse than the rules; use them.
    if (children.every((child) => child.fragments.length === 0)) return ruleSplit(clean, list);
    return { children, shared: verbatimFragments(clean, parsed.shared), source: "ai" };
  } catch (error) {
    console.error("Group split fell back to rules:", error);
    return ruleSplit(clean, list);
  }
}
