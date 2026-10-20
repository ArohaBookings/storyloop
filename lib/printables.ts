// The free printables (public/printables), shared by the guide cards, the
// /try landing and the short QR links at /p/<key>.

/**
 * A free one-page printable on the curriculum guides (14 Oct 2026).
 *
 * Why: Google answers "eylf outcome 4" and similar searches in an AI Overview
 * that cites these pages. In the 28 days to 12 Oct the EYLF outcome pages had
 * 1,270 impressions at positions 1 to 8 and 3 clicks. A printable is the one
 * thing an AI answer can't hand over, so the search title promises it and the
 * page delivers it. The files are in public/printables; their wording comes
 * from the frameworks (see .test-local/marketing/cheatsheets/make-data.mts).
 */
export const PRINTABLES = {
  eylf: {
    href: "/printables/eylf-v2-outcomes-and-sub-outcomes.pdf",
    preview: "/printables/eylf-preview.png",
    title: "All 20 EYLF V2.0 sub-outcomes, on one page",
    alt: "A one-page printable listing the 5 EYLF V2.0 learning outcomes and their 20 sub-outcomes",
  },
  tw: {
    href: "/printables/te-whariki-learning-outcomes.pdf",
    preview: "/printables/tw-preview.png",
    title: "All 20 Te Whāriki learning outcomes, on one page",
    alt: "A one-page printable listing the 20 Te Whāriki learning outcomes by strand, in English and te reo Māori",
  },
  eyfs: {
    href: "/printables/eyfs-areas-of-learning.pdf",
    preview: "/printables/eyfs-preview.png",
    title: "The 7 EYFS areas and 3 characteristics, on one page",
    alt: "A one-page printable of the EYFS prime and specific areas of learning and the characteristics of effective teaching and learning",
  },
  aistear: {
    href: "/printables/aistear-themes.pdf",
    preview: "/printables/aistear-preview.png",
    title: "Aistear's 4 Themes and what changed, on one page",
    alt: "A one-page printable of Aistear's four Themes and the key changes in the 2024 update",
  },
  // Second set, 14 Oct 2026: the next pages where an AI Overview answers the
  // search (GSC 28d to 12 Oct: /eylf-principles-and-practices 214 impressions,
  // 0 clicks; /te-whariki-principles 227, 3) and the blank template people
  // search for ("learning story template free" was 4 clicks from 7 impressions).
  eylfpp: {
    href: "/printables/eylf-principles-and-practices.pdf",
    preview: "/printables/eylfpp-preview.png",
    title: "The 8 EYLF principles and 7 practices, on one page",
    alt: "A one-page printable listing the 8 principles and 7 practices of EYLF V2.0, with a plain-English line under each",
  },
  twps: {
    href: "/printables/te-whariki-principles-strands-goals.pdf",
    preview: "/printables/twps-preview.png",
    title: "Te Whāriki's 4 principles, 5 strands and 18 goals, on one page",
    alt: "A one-page printable of the four Te Whāriki principles and the goals of each of the five strands",
  },
  templateNz: {
    href: "/printables/learning-story-template-te-whariki.pdf",
    // A Word copy to type into (20 Oct 2026): "Can I use it in Word?" is the
    // most-opened question on the template page.
    docx: "/printables/learning-story-template-te-whariki.docx",
    preview: "/printables/template-nz-preview.png",
    title: "Blank learning story template, Te Whāriki (A4 PDF)",
    alt: "A blank A4 learning story template with headings, prompts, lines to write on and tick boxes for the five Te Whāriki strands",
    a4: true,
  },
  templateAu: {
    href: "/printables/learning-story-template-eylf.pdf",
    docx: "/printables/learning-story-template-eylf.docx",
    preview: "/printables/template-au-preview.png",
    title: "Blank learning story template, EYLF V2.0 (A4 PDF)",
    alt: "A blank A4 learning story template with headings, prompts, lines to write on and tick boxes for the five EYLF learning outcomes",
    a4: true,
  },
} as const;

export type PrintableKey = keyof typeof PRINTABLES;

export const PRINTABLE_KEYS: ReadonlySet<string> = new Set(Object.keys(PRINTABLES));

export function isPrintableKey(value: string | null | undefined): value is PrintableKey {
  return typeof value === "string" && PRINTABLE_KEYS.has(value);
}

/** The curriculum each printable belongs to, so its "try a note" demo writes in that curriculum. */
export const PRINTABLE_FRAMEWORK: Record<PrintableKey, "NZ" | "AU" | "UK" | "IE"> = {
  eylf: "AU",
  tw: "NZ",
  eyfs: "UK",
  aistear: "IE",
  eylfpp: "AU",
  twps: "NZ",
  templateNz: "NZ",
  templateAu: "AU",
};
