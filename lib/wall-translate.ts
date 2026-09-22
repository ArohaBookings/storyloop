import OpenAI from "openai";
import {
  isUsableTranslation,
  TRANSLATION_NOTICE,
  WALL_LANGUAGES,
  type TranslatableCard,
  type WallLanguage,
} from "@/lib/wall-languages";

/**
 * Translating a wall card, at publish time, once.
 *
 * This is the only place in StoryLoop where a model's output is shown to the
 * public, so it is worth being precise about what is and is not being trusted.
 *
 * What is trusted: that a good model can render a short, already de-identified
 * paragraph about water and blocks into Samoan or te reo Māori well enough for
 * a family to be glad of it.
 *
 * What is NOT trusted: that it always will. So every answer is validated
 * against the original before it is stored, a failure drops that language
 * rather than the card, and the English is always there underneath. Nobody who
 * scans a code can end up with nothing, and nobody can end up with an apology
 * printed where a translation should be.
 *
 * And the honest part, said on the page itself: I cannot read te reo Māori or
 * Samoan, so this is labelled as machine translation wherever it appears. A
 * family that finds it wrong is told how to say so, which is the only
 * correction mechanism that actually works.
 */

const MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-5.4-mini";

let client: OpenAI | null = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function instructions(language: WallLanguage) {
  return [
    `Translate this early childhood learning card into ${language.english} (${language.endonym}).`,
    "It will be printed beside a display in a childcare centre and read by a family.",
    "",
    "Rules:",
    "- Translate meaning, not words. It should read as though written by an educator in that language.",
    "- Keep it warm and plain. Do not make it more formal or more academic than the original.",
    "- Curriculum terms keep their recognised name in that language where one exists, otherwise leave them as they are.",
    "- Add nothing. Do not explain, do not expand, do not include the original.",
    "- Keep exactly the same number of body paragraphs, dispositions and curriculum items.",
    "",
    `- Also translate this notice, which warns the reader that a machine did this: "${TRANSLATION_NOTICE}"`,
    "",
    'Reply with JSON only: {"heading": string, "body": string[], "dispositions": string[], "curriculum": string[], "tryAtHome": string | null, "notice": string}',
  ].join("\n");
}

async function translateOne(card: TranslatableCard, language: WallLanguage): Promise<TranslatableCard | null> {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: instructions(language) },
        { role: "user", content: JSON.stringify({ ...card, notice: TRANSLATION_NOTICE }) },
      ],
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // The gate. An unusable answer is dropped, never stored, never printed.
    return isUsableTranslation(card, parsed) ? parsed : null;
  } catch (error) {
    console.error(`Wall card translation failed for ${language.code}:`, error);
    return null;
  }
}

/**
 * Translate into every offered language, in parallel, tolerating failure.
 *
 * Publishing must never be blocked by this. A centre that puts a card on a wall
 * and finds it did not appear because a translation API was slow has been let
 * down over a feature they did not ask for.
 */
export async function translateWallCard(card: TranslatableCard): Promise<Record<string, TranslatableCard>> {
  if (!getOpenAI()) return {};

  const results = await Promise.allSettled(
    WALL_LANGUAGES.map(async (language) => [language.code, await translateOne(card, language)] as const),
  );

  const translations: Record<string, TranslatableCard> = {};
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const [code, translated] = result.value;
    if (translated) translations[code] = translated;
  }
  return translations;
}
