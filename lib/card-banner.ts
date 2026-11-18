import { isPaidPlan } from "@/lib/billing-access";

/**
 * Keep the payer (proposal M, 18 Nov 2026): when the card behind a paid plan
 * fails, the app says so in one calm banner with one tap to fix the card on
 * Billing. Until now only the dashboard said it, and most educators never open
 * the dashboard: they go straight to writing.
 *
 * Shown only to the person whose own card it is. A free educator covered by
 * her centre's plan sees nothing (her leader pays), and nothing here mentions
 * pausing or cancelling: those live on Billing only.
 */

export type CardBannerStatus = "past_due" | "unpaid";

type BannerProfile = {
  plan?: string | null;
  subscription_status?: string | null;
  /** Set when the plan comes from her centre (lib/supabase/profiles.ts getAccessProfile). */
  plan_via_centre?: unknown;
};

/** Which banner, if any (pure). past_due: Stripe is still retrying. unpaid: retries are over and new stories wait. */
export function cardBannerStatus(profile: BannerProfile | null | undefined): CardBannerStatus | null {
  if (!profile || profile.plan_via_centre) return null;
  if (!isPaidPlan(profile.plan)) return null;
  if (profile.subscription_status === "past_due") return "past_due";
  // The webhook files unpaid, incomplete and incomplete_expired as payment_required.
  if (profile.subscription_status === "payment_required" || profile.subscription_status === "unpaid") return "unpaid";
  return null;
}

/** Pages that already carry their own payment notice. */
export const CARD_BANNER_HIDDEN_ON = ["/billing", "/dashboard"] as const;

export function cardBannerHiddenOn(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return CARD_BANNER_HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** The words (pure). Calm, short, and nothing about pausing or cancelling. */
export function cardBannerCopy(status: CardBannerStatus): { line: string; button: string } {
  return status === "past_due"
    ? { line: "Your last card payment didn't go through. Everything keeps working while we try again.", button: "Update card" }
    : { line: "Your card payment didn't go through, so new stories are on hold. Your saved stories are all here.", button: "Update card" };
}

/** Where the button goes: Billing, which opens the card page straight away. */
export const CARD_FIX_HREF = "/billing?fix=card";
