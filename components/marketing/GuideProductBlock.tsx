import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SeoPage } from "@/lib/seo-pages";
import StoryDemo from "@/components/landing/StoryDemo";
import OfferText from "@/components/offer/OfferText";
import { guidePriceLine, guideProductFor } from "@/lib/guide-product";

/**
 * The product in a guide's own words, mounted once after the intro in
 * app/[slug]/page.tsx and in the guides with their own route (25 Nov 2026,
 * search re-aim; the entries and their reasons are in lib/guide-product.ts).
 *
 * "note": the existing public demo, right under the first paragraph so it is on
 * the first desktop screen, with the price in one line. It carries id="try",
 * so the page's "try a note" links land on it, and the page drops GuideProof's
 * own box (one note box per page).
 * "leader": one line for a leader and a link to /for-centres.
 * "sentence": the one sentence assistants quote, near the page's demo.
 */
export type GuideProductBlockProps = { page: SeoPage };

export default function GuideProductBlock({ page }: GuideProductBlockProps) {
  return <ProductBlockFor slug={page.slug} />;
}

/** `wrapperClassName`: an outer div (a page section's shell), rendered only when the page has an entry. */
export function ProductBlockFor({ slug, className = "mt-6", wrapperClassName }: { slug: string; className?: string; wrapperClassName?: string }) {
  const entry = guideProductFor(slug);
  if (!entry) return null;
  if (wrapperClassName) {
    return (
      <div className={wrapperClassName}>
        <ProductBlockFor slug={slug} className={className} />
      </div>
    );
  }

  if (entry.kind === "sentence") {
    return (
      <p className={`${className} max-w-3xl text-base leading-relaxed text-ink-700`} data-testid="guide-product-sentence">
        {entry.ownedSentence}
      </p>
    );
  }

  if (entry.kind === "leader") {
    return (
      <div className={`${className} max-w-3xl rounded-2xl border border-sage-200 bg-sage-50/80 p-4 sm:p-5`} data-testid="guide-product-leader">
        <p className="text-base leading-relaxed text-ink-800">
          <OfferText text={entry.text} />
        </p>
        <Link
          href={entry.link.href}
          className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
          data-track="guide_product_leader"
        >
          {entry.link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div id="try" className={`${className} max-w-3xl scroll-mt-24`} data-testid="guide-product-note">
      <p className="font-display text-xl font-bold leading-snug text-ink-900">{entry.label}</p>
      {entry.ownedSentence && <p className="mt-1 text-base leading-relaxed text-ink-700">{entry.ownedSentence}</p>}
      <div className="mt-3">
        <StoryDemo compact surface="guide" framework={entry.demo === "visitor" ? undefined : entry.demo} />
      </div>
      <p className="mt-2 text-sm text-ink-600">{guidePriceLine(entry.demo, { freeSaid: Boolean(entry.ownedSentence?.includes("Free for 3")) })}</p>
    </div>
  );
}
