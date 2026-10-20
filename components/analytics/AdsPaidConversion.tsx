"use client";

import { useEffect } from "react";
import { reportPaidConversion } from "@/lib/analytics/google-ads";

/**
 * Back from Stripe with a paid plan (/dashboard?upgraded=true): tells Google
 * Ads a paid plan started, at the plan's NZ price. The Stripe checkout session
 * is the transaction id, and a per-tab flag stops a reload sending it twice.
 */
export default function AdsPaidConversion({ value, sessionId }: { value: number; sessionId?: string | null }) {
  useEffect(() => {
    if (!(value > 0)) return;
    const key = `storyloop_ads_paid_${sessionId ?? "nosession"}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: Google still drops a repeated transaction id */
    }
    void reportPaidConversion({ value, currency: "NZD", transactionId: sessionId ?? null });
  }, [value, sessionId]);
  return null;
}
