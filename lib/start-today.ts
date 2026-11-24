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
};

/** Only her own trialing Educator or Educator Pro subscription, the one on her profile. Pure. */
export function canStartToday(profile: GateProfile | null | undefined, sub: StartTodaySubscription | null | undefined): boolean {
  if (!isTrialingIndividual(profile) || !sub) return false;
  if (sub.id !== profile?.stripe_subscription_id) return false;
  if (sub.status !== "trialing") return false;
  const plan = sub.metadata?.plan;
  return !plan || plan === "educator" || plan === "educator_pro";
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
