import Image from "next/image";
import { Download } from "lucide-react";

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
} as const;

export type PrintableKey = keyof typeof PRINTABLES;

export default function PrintableCard({ which, compact = false }: { which: PrintableKey; compact?: boolean }) {
  const p = PRINTABLES[which];
  return (
    <div className={`flex min-w-0 items-center gap-4 rounded-3xl border border-clay-200 bg-white p-4 ${compact ? "" : "md:p-5"}`}>
      <a href={p.href} download className="block shrink-0" data-track={`printable_${which}`} aria-label={`Download: ${p.title} (PDF)`}>
        <Image src={p.preview} alt={p.alt} width={compact ? 72 : 96} height={compact ? 90 : 120} className="rounded-lg border border-clay-100 shadow-sm" />
      </a>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-clay-700">Free printable</p>
        <p className="mt-1 font-display text-lg font-bold leading-snug text-ink-900">{p.title}</p>
        <a
          href={p.href}
          download
          data-track={`printable_${which}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
        >
          <Download className="h-4 w-4" /> Download the PDF
        </a>
        <span className="ml-2 text-xs text-ink-500">No sign-up</span>
      </div>
    </div>
  );
}
