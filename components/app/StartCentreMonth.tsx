"use client";
import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { getSessionId, track } from "@/lib/analytics/client";

/**
 * Starts a centre's free month from inside the app: 30 days, no card (see
 * lib/centre-offer.ts). The same checkout the Billing page starts, one tap from
 * wherever a leader is. New Zealand dollars in Aotearoa, Australian elsewhere,
 * the rule the Billing page uses.
 */
export default function StartCentreMonth({ from, className = "btn-primary", label = "Start my centre's free month" }: { from: string; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true); setError("");
    let currency: "NZD" | "AUD" = "AUD";
    try { if (Intl.DateTimeFormat().resolvedOptions().timeZone?.includes("Auckland")) currency = "NZD"; } catch { /* keep AUD */ }
    track("centre_month_click", { from, currency });
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "centre_starter", currency, sessionId: getSessionId() }),
      });
      const data = await response.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error ?? "The free month could not start. Open Billing and try from there.");
    } catch {
      setError("The free month could not start. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <span className="inline-flex min-w-0 flex-col gap-1">
      <button type="button" onClick={start} disabled={busy} className={className} data-testid={`start-centre-month-${from}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        {label}
      </button>
      {error && <span role="alert" className="text-xs text-clay-700">{error}</span>}
    </span>
  );
}
