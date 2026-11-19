"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import TrackOnce from "@/components/analytics/TrackOnce";
import { getPlanByKey, normalizePlanKey, type PlanKey } from "@/lib/plans";

/**
 * Back on the page she left from a wall's one tap (lib/app-wall.ts). The same
 * funnel event the dashboard sends after checkout, and one line. The Google Ads
 * conversion was sent on /upgraded, a page with no child content, on the way
 * here (lib/paid-return.ts): no ad tag loads on this page. It only says she is on a plan once her account says so: the plan is
 * set by Stripe's webhook, never by this page or the address bar.
 */
export default function CheckoutReturn({
  status,
  plan,
  onPlan,
}: {
  status: "upgraded" | "cancelled";
  plan: string | null;
  /** Stripe's session id; the conversion that used it is sent on /upgraded now. */
  sessionId?: string | null;
  onPlan?: (plan: PlanKey) => void;
}) {
  const [confirmed, setConfirmed] = useState<PlanKey | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (status !== "upgraded") return;
    let live = true;
    let tries = 0;
    const check = async () => {
      tries += 1;
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        const current = normalizePlanKey(data?.profile?.plan);
        if (!live) return;
        if (current !== "free") {
          setConfirmed(current);
          onPlan?.(current);
          return;
        }
      } catch {
        /* try again */
      }
      if (!live) return;
      if (tries >= 10) setGaveUp(true);
      else window.setTimeout(check, 1500);
    };
    void check();
    return () => {
      live = false;
    };
    // Once per return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);


  if (status === "cancelled") {
    return (
      <p className="rounded-2xl border border-clay-100 bg-cream-50 px-4 py-3 text-sm text-ink-700" data-testid="checkout-return-cancelled">
        Checkout closed. Nothing was charged, and your work is still here.
      </p>
    );
  }

  return (
    <>
      <TrackOnce event="checkout_success_view" metadata={{ plan, from: "wall" }} />
      <div role="status" className="flex items-start gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-ink-800" data-testid="checkout-return">
        {confirmed ? (
          <>
            <CheckCircle className="mt-0.5 h-4 w-4 flex-none text-sage-700" />
            <span data-testid="checkout-return-paid">
              You&apos;re on {getPlanByKey(confirmed).name}. Write as many as you need, and your work is still here.
            </span>
          </>
        ) : gaveUp ? (
          <span>Stripe is still confirming. Your plan starts the moment it does; there is nothing more to do.</span>
        ) : (
          <>
            <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin text-sage-700" />
            <span>Thanks. Stripe is confirming your plan…</span>
          </>
        )}
      </div>
    </>
  );
}
