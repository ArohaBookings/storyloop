import Link from "next/link";
import CentreTrialWords from "@/components/centre/CentreTrialWords";
import { centreTrialWordsCapital } from "@/lib/centre-offer";

/**
 * The one action on a centre page: start the centre's free period. How long
 * it is free comes from lib/centre-offer.ts and is worked out again in the
 * browser (CentreTrialWords), because the page is built ahead of time.
 */
export default function CentreStart({ secondary }: { secondary?: { href: string; label: string } }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:items-start" data-testid="buyer-centre-start">
      <Link href="/signup?plan=centre_starter" className="btn-primary w-full justify-center py-3.5 text-base sm:w-auto" data-track="buyer_centre_start">
        Start your centre free
      </Link>
      <p className="text-center text-sm text-ink-600 sm:text-left">
        <CentreTrialWords initial={centreTrialWordsCapital(new Date())} capital />, no card. Up to 10 educators, unlimited children.
      </p>
      {secondary && (
        <a href={secondary.href} className="inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900 sm:justify-start" data-track="buyer_centre_secondary">
          {secondary.label}
        </a>
      )}
    </div>
  );
}
