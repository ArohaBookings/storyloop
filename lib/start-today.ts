/**
 * "Start my plan today" from the statement wall (25 Nov 2026, B2).
 *
 * For an individual account in its free week: the free week ends now, the
 * first month is charged today on the card already on file, and the plan
 * renews monthly from today. Stories keep the free week; this is only offered
 * where statements need the plan. Pure.
 */
import type { CurrencyCode } from "@/lib/plans";
import { isTrialingIndividual, type GateProfile } from "@/lib/statement-gate";

export type StartTodaySubscription = {
  id: string;
  status: string;
  metadata?: Record<string, string> | null;
  trial_start?: number | null;
  trial_end?: number | null;
};

/** The free week is 7 days; a day of slack for time zones. The free month of Pro (30 days) is not it. */
const FREE_WEEK_MAX_SECONDS = 8 * 86_400;

/** A trial that is the 7-day free week, not an offer's longer trial (the free month of Pro). Pure. */
export function isFreeWeekTrial(sub: StartTodaySubscription, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (sub.metadata?.offer_id) return false;
  if (typeof sub.trial_end === "number" && sub.trial_end - nowSeconds > FREE_WEEK_MAX_SECONDS) return false;
  if (typeof sub.trial_start === "number" && typeof sub.trial_end === "number") {
    return sub.trial_end - sub.trial_start <= FREE_WEEK_MAX_SECONDS;
  }
  return true;
}

/** Only her own trialing Educator or Educator Pro subscription in its free week, the one on her profile. Pure. */
export function canStartToday(profile: GateProfile | null | undefined, sub: StartTodaySubscription | null | undefined): boolean {
  if (!isTrialingIndividual(profile) || !sub) return false;
  if (sub.id !== profile?.stripe_subscription_id) return false;
  if (sub.status !== "trialing") return false;
  if (!isFreeWeekTrial(sub)) return false;
  const plan = sub.metadata?.plan;
  return !plan || plan === "educator" || plan === "educator_pro";
}

/**
 * What the statement wall may offer this account (R1-1, 25 Nov review).
 *   free           no subscription on her profile: checkout, no free week
 *   eligible       her free week: start it today on the card on file
 *   failed         Stripe did not answer: Billing, never a second checkout
 *   already_paying the profile and Stripe disagree (Stripe says the plan runs): Billing
 *   long_trial     an offer's longer trial (the free month of Pro): Billing
 *   not_eligible   anything else with a subscription: Billing
 * Pure.
 */
export type StartTodayState = "free" | "eligible" | "failed" | "already_paying" | "long_trial" | "not_eligible";

export function startTodayState(profile: GateProfile | null | undefined, sub: StartTodaySubscription | "error" | null | undefined): StartTodayState {
  if (!profile?.stripe_subscription_id) return "free";
  if (sub === "error") return "failed";
  if (!sub || sub.id !== profile.stripe_subscription_id) return "not_eligible";
  if (canStartToday(profile, sub)) return "eligible";
  if (sub.status === "trialing" && !isFreeWeekTrial(sub)) return "long_trial";
  if (sub.status !== "trialing" && !["canceled", "incomplete_expired"].includes(sub.status)) return "already_paying";
  return "not_eligible";
}

/** Where the wall's "Start my plan today" goes. Only a free account ever reaches checkout. Pure. */
export function wallPayPath(state: StartTodayState): "checkout" | "start_today" | "billing" {
  if (state === "free") return "checkout";
  if (state === "eligible") return "start_today";
  return "billing";
}

/** The plan's own name for the wall's price line (Educator or Educator Pro). Pure. */
export function startTodayPlanName(sub: StartTodaySubscription): "Educator" | "Educator Pro" {
  return sub.metadata?.plan === "educator_pro" ? "Educator Pro" : "Educator";
}

/** Stripe's lowercase currency as ours, or null for anything else. Pure. */
export function currencyFromStripe(value: string | null | undefined): CurrencyCode | null {
  const upper = String(value ?? "").toUpperCase();
  return upper === "NZD" || upper === "AUD" ? upper : null;
}

/** "NZ$21 today, then NZ$21 a month." from cents. Pure. */
export function startTodayLine(todayCents: number, monthlyCents: number, currency: CurrencyCode): string {
  const money = (cents: number) => {
    const prefix = currency === "NZD" ? "NZ$" : "A$";
    return cents % 100 === 0 ? `${prefix}${cents / 100}` : `${prefix}${(cents / 100).toFixed(2)}`;
  };
  if (todayCents <= 0) return `Nothing today, then ${money(monthlyCents)} a month.`;
  return `${money(todayCents)} today, then ${money(monthlyCents)} a month.`;
}

/**
 * What she reads when her bank wants to confirm the first payment (MERGE2 2f).
 * Billing cannot confirm a payment or start a plan early; it can replace the
 * card through Update card, where the bank confirms the card itself, and then
 * this button works with it. So the words send her exactly there, and back.
 */
export const NEEDS_ACTION_MESSAGE =
  "Your bank wants you to confirm this payment, and this button cannot ask for that. Nothing was charged and your free week carries on. On Billing, tap Update card and confirm your card with your bank there. Then come back and tap Start my plan today again.";

/** Card errors from Stripe, in plain words. Pure. */
export function startTodayFailure(error: unknown): { code: "declined" | "needs_action" | "failed"; hostedInvoiceUrl: string | null } {
  const e = (error ?? {}) as { code?: string; type?: string; raw?: { code?: string; payment_intent?: { status?: string } }; payment_intent?: { status?: string } };
  const code = e.code ?? e.raw?.code;
  if (code === "authentication_required" || e.raw?.payment_intent?.status === "requires_action") return { code: "needs_action", hostedInvoiceUrl: null };
  if (e.type === "StripeCardError" || e.type === "card_error" || code === "card_declined" || code === "expired_card" || code === "insufficient_funds") return { code: "declined", hostedInvoiceUrl: null };
  return { code: "failed", hostedInvoiceUrl: null };
}

/** The checkout metadata key that marks a statement-wall checkout with no free week. */
export const STATEMENT_WALL_KEY = "statement_wall";

/**
 * A free account that pays from the statement wall goes through checkout (no
 * card on file to charge). When that checkout completes, the webhook records
 * the same statement_plan_started as "Start my plan today", from "free", so
 * both ways of paying from the wall are counted. Null for any other checkout.
 * Pure.
 */
export function statementPlanStartedFromCheckout(session: {
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  currency?: string | null;
}): { from: "free"; currency?: CurrencyCode; amount_cents: number } | null {
  if (session.metadata?.[STATEMENT_WALL_KEY] !== "true") return null;
  const currency = currencyFromStripe(session.metadata?.currency ?? session.currency) ?? undefined;
  return { from: "free", currency, amount_cents: Math.max(0, session.amount_total ?? 0) };
}
