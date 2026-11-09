import OpenAI from "openai";
import { usesReasoningContract } from "@/lib/ai/generate";
import { UNCLEAR_MARK, hasUnclearMark } from "@/lib/notes-photo";

export { UNCLEAR_MARK, hasUnclearMark };

/**
 * "Photo of my notes" (10 Nov 2026).
 *
 * An educator photographs what they jotted on paper, a sticky note or the
 * room's day book, and the words land in the observation box as if they had
 * typed them. Why: 59% of signups are on a phone, most of them from Facebook's
 * in-app browser, and in the week to 9 Nov 2026 three of eight new educators
 * never wrote a first story. Typing a note with two thumbs is the last piece of
 * effort between a note that already exists on paper and a finished story.
 *
 * It is a reader, not a writer. The model is told to copy the words and nothing
 * else, to mark what it cannot read as [unclear] rather than guess, and never
 * to describe a person. The educator sees the text in the box and corrects it
 * before anything is written, and the story page refuses to generate while an
 * [unclear] remains. The story pipeline itself is untouched: it receives a
 * typed note, exactly as before.
 *
 * The photo is sent to the AI provider to be read and is never stored by
 * StoryLoop (the route keeps it in memory for the length of the request).
 */
export const NOTES_PHOTO_MODEL = process.env.OPENAI_NOTES_PHOTO_MODEL?.trim() || "gpt-5.4-mini";
export const NOTES_PHOTO_FALLBACK_MODEL = process.env.OPENAI_NOTES_PHOTO_FALLBACK_MODEL?.trim() || "gpt-5.4";
/** The browser shrinks the photo first, so anything larger is not from the app. */
export const NOTES_PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const NOTES_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const NOTES_PHOTO_MAX_CHARS = 6000;

export const NOTES_PHOTO_PROMPT = `You are reading a photo of an early childhood educator's own notes about children's play and learning. The notes may be handwritten or printed.

Copy out the words written in the photo, exactly as written. Rules:
- Transcribe only writing that is visible in the photo. Do not add, guess, complete, tidy, correct, summarise or interpret anything. Keep the educator's wording, abbreviations, spelling and punctuation.
- Keep quotation marks and any child's words exactly as written.
- Put each separate note or line on its own line. No headings, no bullet marks that are not on the paper, no commentary, no markdown.
- If a word cannot be read with confidence, write ${UNCLEAR_MARK} in its place. Never guess a name, a number or a quoted word.
- Do not describe the photo, the paper, the room or any person in it. If the photo shows people or objects and no written notes, there is nothing to copy.
- If there is no readable writing, reply with exactly: NO_NOTES`;

export type NotesReading = { text: string; unclear: number };

/** The model's reply as a note, or null when there was nothing usable to read. */
export function cleanNotesTranscription(raw: string | null | undefined): NotesReading | null {
  let text = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*```[a-z]*\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  if (!text || /^NO_NOTES\b/i.test(text)) return null;
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, NOTES_PHOTO_MAX_CHARS)
    .trim();
  const unclear = (text.match(/\[unclear\]/gi) ?? []).length;
  // A page that is nearly all [unclear] is not a note anyone can use.
  const readableWords = text.replace(/\[unclear\]/gi, " ").split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  if (readableWords < 3) return null;
  return { text: text.replace(/\[unclear\]/gi, UNCLEAR_MARK), unclear };
}

async function readWith(model: string, dataUrl: string, timeoutMs: number): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: timeoutMs, maxRetries: 0 });
  const messages = [
    { role: "system" as const, content: NOTES_PHOTO_PROMPT },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: "Copy out the notes written in this photo." },
        { type: "image_url" as const, image_url: { url: dataUrl, detail: "high" as const } },
      ],
    },
  ];
  const params = usesReasoningContract(model)
    ? { model, max_completion_tokens: 3000, reasoning_effort: "low", messages }
    : { model, max_tokens: 2000, temperature: 0, messages };
  // Cast: older SDK typings predate the GPT-5 reasoning params (see lib/ai/generate.ts).
  const res = await client.chat.completions.create(params as Parameters<typeof client.chat.completions.create>[0]);
  return ("choices" in res ? res.choices[0]?.message?.content : "") ?? "";
}

/**
 * Reads the writing in a photo. Throws when the provider cannot be reached at
 * all; returns null when it answered but there were no notes to read.
 */
export async function readNotesPhoto(input: { base64: string; mimeType: string }): Promise<(NotesReading & { model: string }) | null> {
  if (!process.env.OPENAI_API_KEY) throw new Error("Reading a photo needs the AI provider to be set up.");
  const dataUrl = `data:${input.mimeType};base64,${input.base64}`;
  const started = Date.now();
  try {
    const raw = await readWith(NOTES_PHOTO_MODEL, dataUrl, 35_000);
    const reading = cleanNotesTranscription(raw);
    return reading ? { ...reading, model: NOTES_PHOTO_MODEL } : null;
  } catch (error) {
    const elapsed = Date.now() - started;
    // The same-family backup, only when the first failure was quick (a model
    // that refuses images or is briefly unavailable), never after a timeout.
    if (!NOTES_PHOTO_FALLBACK_MODEL || NOTES_PHOTO_FALLBACK_MODEL === NOTES_PHOTO_MODEL || elapsed > 12_000) throw error;
    console.warn("Notes photo: first model failed, trying the backup.", error instanceof Error ? error.message : error);
    const raw = await readWith(NOTES_PHOTO_FALLBACK_MODEL, dataUrl, 35_000);
    const reading = cleanNotesTranscription(raw);
    return reading ? { ...reading, model: NOTES_PHOTO_FALLBACK_MODEL } : null;
  }
}
