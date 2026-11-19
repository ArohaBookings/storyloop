import StoryDemo from "@/components/landing/StoryDemo";
import ProofChip from "@/components/buyer/ProofChip";
import VisitorProof from "@/components/buyer/VisitorProof";
import { heroNoteProof, outcomeNoteProof } from "@/lib/buyer-proof";
import { educatorOffer } from "@/lib/offer-wording";

export type ProductHeroRegion = "NZ" | "AU" | "visitor";

/**
 * The product on the first screen of a product page (18 Nov 2026 re-aim):
 * a real note, what StoryLoop wrote from it, and the note box, the way the
 * pages for buyers open (components/buyer/BuyerPage.tsx). The guide below
 * keeps its full real draft; only the note box moves up here.
 *
 * Australian pages show the EYLF outcome line with its reason, Aotearoa pages
 * the Te Whāriki draft, and a page for both countries follows the visitor's
 * time zone. The price line is in her currency where the page is one country's.
 */
export default function ProductHero({ region }: { region: ProductHeroRegion }) {
  const outcome = region === "AU" ? outcomeNoteProof() : null;
  const price =
    region === "NZ"
      ? educatorOffer("NZD").perMonth
      : region === "AU"
        ? educatorOffer("AUD").perMonth
        : `${educatorOffer("NZD").priceLabel} or ${educatorOffer("AUD").perMonth}`;

  return (
    <div className="mt-3 grid min-w-0 gap-3 sm:mt-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-12" data-testid="product-hero">
      <div className="min-w-0 max-w-xl">
        {region === "visitor" ? (
          <VisitorProof au={heroNoteProof("AU")} nz={heroNoteProof("NZ")} />
        ) : outcome ? (
          <ProofChip proof={outcome} wroteLabel="The EYLF link StoryLoop wrote" />
        ) : (
          <ProofChip proof={heroNoteProof(region)} />
        )}
      </div>
      <div id="try" className="min-w-0 scroll-mt-24" data-testid="product-hero-try">
        <StoryDemo compact surface="guide" framework={region === "visitor" ? undefined : region} />
        <p className="mt-2 text-xs leading-relaxed text-ink-500">
          Free for 3 stories a month, no card. Unlimited is {price}. You check every word.
        </p>
      </div>
    </div>
  );
}
