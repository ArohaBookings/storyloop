"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { getSessionId, track } from "@/lib/analytics/client";

type Currency = "NZD" | "AUD";

/** The claim button: currency, then Stripe. The server decides eligibility. */
export default function ProMonthClaim({ prices, firstCharge }: { prices: Record<Currency, number>; firstCharge: string }) {
  const [currency, setCurrency] = useState<Currency>("AUD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      if (zone.includes("Auckland") || zone.includes("Chatham")) setCurrency("NZD");
    } catch { /* default stays AUD */ }
    track("offer_view", { offer: "pro_month" });
  }, []);

  const claim = async () => {
    setLoading(true);
    setError("");
    track("offer_click", { offer: "pro_month", currency });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: "pro_month", currency, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Checkout could not start. Please try again in a moment.");
    } catch {
      setError("Checkout could not start. Please check your connection and try again.");
    }
    setLoading(false);
  };

  const symbol = currency === "NZD" ? "NZ$" : "A$";

  return (
    <div className="mt-6">
      <div role="radiogroup" aria-label="Currency" className="inline-flex rounded-full border border-clay-200 bg-cream-50 p-1">
        {(["NZD", "AUD"] as Currency[]).map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={currency === code}
            onClick={() => setCurrency(code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${currency === code ? "bg-clay-700 text-paper" : "text-ink-600 hover:text-ink-900"}`}
          >
            {code === "NZD" ? "New Zealand" : "Australia"}
          </button>
        ))}
      </div>
      <dl className="mt-5 divide-y divide-clay-100 rounded-2xl border border-clay-100 bg-cream-50/60 px-4">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-base text-ink-700">Today to {firstCharge}</dt>
          <dd className="font-display text-2xl font-bold text-ink-900">Free</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-base text-ink-700">After that, if you keep Pro</dt>
          <dd className="font-display text-2xl font-bold tabular-nums text-ink-900">
            {symbol}{prices[currency]}<span className="text-sm font-normal text-ink-500"> a month</span>
          </dd>
        </div>
      </dl>
      <button type="button" onClick={claim} disabled={loading} className="btn-primary group mt-5 w-full justify-center py-3.5 text-base" data-testid="claim-pro-month">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Start my free month
        {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
