"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";
import { CARD_FIX_HREF, cardBannerCopy, cardBannerHiddenOn, type CardBannerStatus } from "@/lib/card-banner";

const SEEN_KEY = "storyloop_card_banner_seen";

/**
 * One calm line when the card behind her plan has failed (lib/card-banner.ts),
 * with one tap to fix it on Billing. Not on Billing or the dashboard, which
 * carry their own notice, and never in front of the note box: it sits at the
 * top of the page, above everything else.
 */
export default function CardFailedBanner({ status }: { status: CardBannerStatus }) {
  const pathname = usePathname();
  const hidden = cardBannerHiddenOn(pathname);

  useEffect(() => {
    if (hidden) return;
    // Counted once a visit, not on every page she opens.
    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === status) return;
      window.sessionStorage.setItem(SEEN_KEY, status);
    } catch {
      /* storage blocked: counted on this page */
    }
    trackEvent("card_banner_shown", { status });
  }, [hidden, status]);

  if (hidden) return null;
  const copy = cardBannerCopy(status);

  return (
    <div role="status" className="border-b border-amber-100 bg-amber-50 px-4 py-3 sm:px-6 md:px-8" data-testid="card-banner">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 text-sm leading-relaxed text-ink-800">{copy.line}</p>
        <Link
          href={CARD_FIX_HREF}
          onClick={() => trackEvent("card_banner_tap", { status })}
          className="btn-secondary min-h-11 flex-none self-start px-4 py-2 sm:self-auto"
          data-testid="card-banner-fix"
        >
          <CreditCard className="h-4 w-4" />
          {copy.button}
        </Link>
      </div>
    </div>
  );
}
