"use client";

import { CENTRE_START_NO_CHECKOUT } from "@/lib/build-switches";
import { isCentrePlan } from "@/lib/centre-offer";
import { OFFER_STORAGE_KEY, offerRefFromHash, offerRefFromStorage } from "@/lib/story-check";

/**
 * Where a new account with a paid plan goes after signup (email or Google).
 * A centre plan with CENTRE_START_NO_CHECKOUT on: the centre starts free with
 * no payment page (app/api/centres/start-free) and she lands on /centre. Any
 * other answer, or any failure: today's checkout page, so she always has a
 * way on. Returns the address to go to, or null when checkout did not open.
 */
export async function paidPlanDestination(input: { plan: string; currency?: string | null; sessionId?: string | null }): Promise<string | null> {
  const checkout = async (): Promise<string | null> => {
    const data = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: input.plan, currency: input.currency ?? undefined, sessionId: input.sessionId ?? undefined }),
    })
      .then(async (r) => (r.ok ? await r.json().catch(() => ({})) : {}))
      .catch(() => ({}));
    return typeof data.url === "string" && data.url ? data.url : null;
  };
  if (!CENTRE_START_NO_CHECKOUT || !isCentrePlan(input.plan)) return checkout();
  let offerRef = "";
  try {
    offerRef = offerRefFromHash(window.location.hash) || offerRefFromStorage(window.localStorage.getItem(OFFER_STORAGE_KEY));
  } catch { /* no storage */ }
  try {
    const response = await fetch("/api/centres/start-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: input.plan, currency: input.currency ?? undefined, ...(offerRef ? { offerRef } : {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && typeof data.trialEndsAt === "string") return "/centre?started=free";
    if (data.code === "already") return "/centre";
  } catch { /* checkout instead */ }
  return checkout();
}
