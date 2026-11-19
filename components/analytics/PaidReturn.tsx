"use client";

import { useEffect } from "react";
import { reportPaidConversion } from "@/lib/analytics/google-ads";

/**
 * On /upgraded only (lib/paid-return.ts): one "paid plan started" conversion at
 * the plan's NZ price, with the Stripe session as the transaction id (a per-tab
 * flag stops a reload sending it twice), then on to the page she came from. It
 * waits at most about three seconds for the Google tag (live site only) and
 * never blocks her for longer.
 */
export default function PaidReturn({ value, sessionId, target }: { value: number; sessionId: string | null; target: string }) {
  useEffect(() => {
    let moved = false;
    const go = () => {
      if (moved) return;
      moved = true;
      window.location.replace(target);
    };
    const key = `storyloop_ads_paid_${sessionId ?? "nosession"}`;
    let sendNow = value > 0;
    try {
      if (window.sessionStorage.getItem(key)) sendNow = false;
      else if (sendNow) window.sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: Google still drops a repeated transaction id */
    }
    if (!sendNow) {
      go();
      return;
    }
    const failsafe = window.setTimeout(go, 5000);
    void reportPaidConversion({ value, currency: "NZD", transactionId: sessionId, maxWaitMs: 3000 }).finally(() => {
      window.clearTimeout(failsafe);
      go();
    });
  }, [value, sessionId, target]);
  return null;
}
