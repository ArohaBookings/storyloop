"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { getSessionId } from "@/lib/analytics/client";
import { trackEvent } from "@/lib/analytics/track-event";
import { dismissPriceReminder, readWallMemory, shouldShowPriceReminder, wallSeenThisVisit, type AppWall } from "@/lib/app-wall";
import { browserCurrency, educatorOffer, type EducatorOffer } from "@/lib/offer-wording";
import { useEducatorCheckoutLine } from "@/components/app/useEducatorCheckoutLine";

/**
 * After she has met a free-limit wall, later visits show this one quiet line:
 * the price and the same one tap to Stripe Checkout (lib/app-wall.ts). Never in
 * the same visit as the wall, never near the note box, and gone for good once
 * she closes it (until she meets another wall). The price is the money
 * checkout will really charge her, as on the wall (lib/wall-offer.ts).
 */
export default function PriceReminder({ free, returnTo, className = "" }: { free: boolean; returnTo?: string; className?: string }) {
  const [shown, setShown] = useState<{ offer: EducatorOffer; wall: AppWall } | null>(null);
  const [busy, setBusy] = useState(false);
  const { line } = useEducatorCheckoutLine(Boolean(shown) && free);

  useEffect(() => {
    const memory = readWallMemory();
    if (!shouldShowPriceReminder({ free, memory, wallThisVisit: wallSeenThisVisit() }) || !memory) return;
    const offer = educatorOffer(browserCurrency());
    setShown({ offer, wall: memory.wall });
    trackEvent("price_reminder_shown", { wall: memory.wall, plan: "educator", currency: offer.currency, price: offer.price });
  }, [free]);

  if (!shown || !free || !line) return null;
  const { offer, wall } = shown;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    trackEvent("price_reminder_tap", { wall, plan: "educator", currency: offer.currency });
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "educator", currency: offer.currency, activationOffer: true, returnTo, wall, sessionId: getSessionId() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") throw new Error("no checkout");
      window.location.assign(data.url);
    } catch {
      setBusy(false);
      window.location.assign("/billing");
    }
  };

  const close = () => {
    dismissPriceReminder();
    trackEvent("ui_action", { action: "price_reminder_dismissed" });
    setShown(null);
  };

  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-clay-100 bg-cream-50 px-3 py-2 text-sm text-ink-700 ${className}`} data-testid="price-reminder">
      <p className="min-w-0 flex-1 leading-snug">
        Educator: {line}{" "}
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900 sm:min-h-0"
          data-testid="price-reminder-start"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {offer.trialDays > 0 ? `Start ${offer.trialDays} days free` : "Start Educator"}
        </button>
      </p>
      <button type="button" onClick={close} className="flex h-11 w-11 flex-none items-center justify-center text-ink-400 hover:text-ink-800" aria-label="Close the price reminder" data-testid="price-reminder-close">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
