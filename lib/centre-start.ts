/**
 * "Start your centre free" with no payment page (25 Nov 2026, B6, switch
 * CENTRE_START_NO_CHECKOUT). A new centre is free until the end of 31 January
 * 2027 (New Zealand time) with no card; the subscription is made by API with
 * the same terms and metadata checkout gives, so the webhook, the founding
 * spots and the money reports read it exactly like a checkout-made one.
 * Anything that is not a plain new centre goes to today's checkout page. Pure.
 */
import { CENTRE_TRIAL_DAYS, centreTrialEnd } from "@/lib/centre-offer";

export type StartFreeDecision = "start" | "needs_checkout" | "already";

export function startFreeDecision(input: {
  switchOn: boolean;
  /** Already a member (or owner) of a centre. */
  inCentre: boolean;
  /** Her own subscription is live (active, trialing, past due, paused). */
  hasLiveSub: boolean;
  /** That live subscription is already a centre plan. */
  liveSubIsCentre?: boolean;
  /** This customer has had a centre subscription before (one free period per centre). */
  hadCentreBefore: boolean;
}): StartFreeDecision {
  if (!input.switchOn) return "needs_checkout";
  if (input.inCentre || (input.hasLiveSub && input.liveSubIsCentre)) return "already";
  if (input.hasLiveSub || input.hadCentreBefore) return "needs_checkout";
  return "start";
}

/** Statuses that mean a subscription is still hers. Pure. */
export function isLiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing" || status === "past_due" || status === "paused" || status === "payment_required";
}

/** The free period's end: the end of 31 January 2027 for a 2026 start, else 30 days. Pure. */
export function startFreeTrialEnd(now: Date): Date {
  return centreTrialEnd(now) ?? new Date(now.getTime() + CENTRE_TRIAL_DAYS * 86_400_000);
}

/** The centre's name: what she typed, else the name on the educator's link, else none yet. Pure. */
export function startFreeCentreName(typed: unknown, fromOffer: string | null | undefined): string | null {
  const clean = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 120) : "");
  const name = clean(typed) || clean(fromOffer);
  return name.length >= 2 ? name : null;
}
