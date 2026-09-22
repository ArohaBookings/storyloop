/**
 * The languages a wall card is offered in, and how one is chosen for a person
 * standing in front of it.
 *
 * WHY THIS IS SAFE TO SEND TO A MODEL AT ALL. A wall card has already been
 * stripped of every name, date and age by lib/wall-card.ts, and an educator has
 * confirmed what it says. There is nothing in it about any child, which is
 * exactly what makes it the one piece of content in StoryLoop that can be
 * handed to a translation API without a second thought. The privacy design
 * pays for itself twice.
 *
 * THE LIST IS EVIDENCED, NOT GUESSED. New Zealand's 2023 Census records te reo
 * Māori as the most widely spoken language after English, then Samoan,
 * Northern Chinese, Hindi, Tagalog and Cantonese. Australia's 2021 Census
 * records Mandarin, Arabic, Vietnamese, Cantonese and Punjabi as the largest
 * languages other than English. Tongan is here for the sector rather than the
 * ranking: it is common in New Zealand early learning specifically.
 *
 * EVERY LANGUAGE IS NAMED IN ITSELF. A picker labelled "Samoan" in English is
 * useless to the person who most needs it, which is the grandparent who does
 * not read English and is holding a phone in front of a painting. The endonym
 * is the whole point of the control.
 */

export type WallLanguage = {
  /** BCP 47 tag, used for the lang attribute and for matching a browser. */
  code: string;
  /** What this language calls itself. This is what a reader sees. */
  endonym: string;
  /** What it is called in English, for the educator's side only. */
  english: string;
  /** Right to left scripts need the direction set or they render as nonsense. */
  rtl?: boolean;
};

export const WALL_LANGUAGES: WallLanguage[] = [
  { code: "mi", endonym: "Te Reo Māori", english: "te reo Māori" },
  { code: "sm", endonym: "Gagana Sāmoa", english: "Samoan" },
  { code: "to", endonym: "Lea Faka-Tonga", english: "Tongan" },
  { code: "zh-Hans", endonym: "简体中文", english: "Chinese (Simplified)" },
  { code: "zh-Hant", endonym: "繁體中文", english: "Chinese (Traditional)" },
  { code: "hi", endonym: "हिन्दी", english: "Hindi" },
  { code: "pa", endonym: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { code: "tl", endonym: "Tagalog", english: "Tagalog" },
  { code: "ar", endonym: "العربية", english: "Arabic", rtl: true },
  { code: "vi", endonym: "Tiếng Việt", english: "Vietnamese" },
];

export const WALL_LANGUAGE_CODES = WALL_LANGUAGES.map((language) => language.code);

export function findWallLanguage(code: string | null | undefined): WallLanguage | null {
  if (!code) return null;
  const wanted = code.trim().toLowerCase();
  return WALL_LANGUAGES.find((language) => language.code.toLowerCase() === wanted) ?? null;
}

/**
 * Choose a language from a browser's Accept-Language header.
 *
 * This is the moment the feature is actually for. A grandparent whose phone is
 * set to Samoan scans a code and reads about their mokopuna's morning in
 * Samoan, without knowing there was a choice to make. Nobody should have to
 * find a menu to be spoken to in their own language.
 *
 * Matching is deliberately generous: "zh-CN" and "zh" both reach simplified
 * Chinese, "zh-TW" and "zh-HK" reach traditional, and a region suffix is
 * ignored everywhere else. Quality values are honoured, because a browser that
 * says it prefers Samoan over English means it.
 */
export function preferredLanguage(
  acceptLanguage: string | null | undefined,
  available: string[],
): string | null {
  if (!acceptLanguage) return null;
  const offered = new Set(available);

  const entries = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const entry of entries) {
    // English is what the card is already in, so it is never a "translation".
    if (entry.tag === "en" || entry.tag.startsWith("en-")) return null;

    const direct = WALL_LANGUAGES.find((language) => language.code.toLowerCase() === entry.tag);
    if (direct && offered.has(direct.code)) return direct.code;

    // Chinese is the one that cannot be matched by prefix alone: the script
    // matters more than the language, and a region tag is how a phone says it.
    if (entry.tag.startsWith("zh")) {
      const traditional = /\b(hant|tw|hk|mo)\b/.test(entry.tag);
      const wanted = traditional ? "zh-Hant" : "zh-Hans";
      if (offered.has(wanted)) return wanted;
      continue;
    }

    const base = entry.tag.split("-")[0];
    const byBase = WALL_LANGUAGES.find((language) => language.code.split("-")[0].toLowerCase() === base);
    if (byBase && offered.has(byBase.code)) return byBase.code;
  }
  return null;
}

/** The translatable half of a card. Nothing here can contain a child. */
export type TranslatableCard = {
  heading: string;
  body: string[];
  dispositions: string[];
  curriculum: string[];
  tryAtHome: string | null;
  /**
   * The machine-translation notice, in this language.
   *
   * It was in English at first, which meant the one warning on the page was
   * unreadable to the only person it was written for. A Samoan reader being
   * told, in English, that the Samoan might be wrong is not a disclosure.
   * Absent falls back to English, which is no worse than before.
   */
  notice?: string | null;
};

/** What the notice says, and what gets translated alongside the card. */
export const TRANSLATION_NOTICE =
  "This was translated by machine from the educator's English. If something reads wrongly, please tell a kaiako, and read the English version above.";

/**
 * Check a translation before it is ever stored.
 *
 * A model asked for JSON usually returns JSON, and the once in a thousand times
 * it returns an apology, a refusal, or the English back again, that text would
 * be printed on a wall in a centre and read by a family who trusted it. So the
 * shape is checked, the length is sanity checked against the original, and
 * anything that comes back identical to the English is treated as a failure
 * rather than a translation.
 */
export function isUsableTranslation(original: TranslatableCard, candidate: unknown): candidate is TranslatableCard {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
  const value = candidate as Record<string, unknown>;

  if (typeof value.heading !== "string" || !value.heading.trim()) return false;
  if (!Array.isArray(value.body) || value.body.some((item) => typeof item !== "string")) return false;
  if (!Array.isArray(value.dispositions) || value.dispositions.some((item) => typeof item !== "string")) return false;
  if (!Array.isArray(value.curriculum) || value.curriculum.some((item) => typeof item !== "string")) return false;
  if (value.tryAtHome !== null && value.tryAtHome !== undefined && typeof value.tryAtHome !== "string") return false;
  if (value.notice !== null && value.notice !== undefined && typeof value.notice !== "string") return false;

  // The same number of paragraphs and labels, or something was dropped.
  if ((value.body as string[]).length !== original.body.length) return false;
  if ((value.dispositions as string[]).length !== original.dispositions.length) return false;
  if ((value.curriculum as string[]).length !== original.curriculum.length) return false;

  const originalLength = [original.heading, ...original.body].join(" ").length;
  const candidateLength = [value.heading as string, ...(value.body as string[])].join(" ").length;
  if (candidateLength === 0) return false;
  // Translations vary in length, but not by an order of magnitude. A wildly
  // short answer is a refusal and a wildly long one is an explanation.
  if (candidateLength < originalLength * 0.25 || candidateLength > originalLength * 4) return false;

  // English handed back is a failure, not a translation.
  const sameBody = (value.body as string[]).every((item, index) => item.trim() === original.body[index]?.trim());
  if (sameBody && (value.heading as string).trim() === original.heading.trim()) return false;

  return true;
}
