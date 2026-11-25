/**
 * Statements past the free allowance need the first payment (Leo, 24 Nov 2026).
 *
 * The free week keeps stories exactly as they are. For statements, an account
 * in its free week gets the same free allowance as a free account (3 an hour,
 * 9 a day, the SAME counters), and past it the wall asks for the first month
 * today. The two statement routes are protected files, so nothing in them
 * changes: a rewrite in next.config.ts sends both through
 * app/api/statement-gate, which counts for a trialing account and otherwise
 * hands the untouched request to the protected handler.
 *
 * Pure. STATEMENTS_PAY_TODAY (lib/build-switches.ts) off: every call delegates.
 */
import { normalizePlanKey } from "@/lib/plans";

export type GateProfile = {
  plan: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  applied_access_code: string | null;
};

/**
 * Her OWN profile (getOrCreateProfile, never the centre-covered one) is an
 * individual Educator or Educator Pro in its free week, paid through Stripe.
 * An access code or a centre plan is never this. Pure.
 */
export function isTrialingIndividual(profile: GateProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.subscription_status !== "trialing") return false;
  if (!profile.stripe_subscription_id) return false;
  if (profile.applied_access_code) return false;
  const plan = normalizePlanKey(profile.plan ?? "free");
  return plan === "educator" || plan === "educator_pro";
}

/** A day of slack over the 7-day free week. */
const FREE_WEEK_MAX_MS = 8 * 86_400_000;

/**
 * Her trial is the 7-day free week (R1-2, 25 Nov review): not the free month of
 * Educator Pro (its redeemed grant names this subscription), and not any trial
 * that still has more than a week to run. Only the free week is gated. Pure.
 */
export function isFreeWeekProfile(
  profile: (GateProfile & { trial_ends_at?: string | null }) | null | undefined,
  input: { now: Date; proMonthSubscriptionId: string | null },
): boolean {
  if (!isTrialingIndividual(profile)) return false;
  if (input.proMonthSubscriptionId && input.proMonthSubscriptionId === profile?.stripe_subscription_id) return false;
  const ends = profile?.trial_ends_at ? Date.parse(profile.trial_ends_at) : NaN;
  if (Number.isFinite(ends) && ends - input.now.getTime() > FREE_WEEK_MAX_MS) return false;
  return true;
}

export type GateDecision = "delegate" | "hour_limit" | "day_limit";

/**
 * What the gate does with one request. hourOk and dayOk are the answers of the
 * same two counters the protected routes use for a free account (the day
 * counter is only asked when the hour one said yes, as there). Pure.
 */
export function gateDecision(input: { switchOn: boolean; trialing: boolean; hourOk?: boolean; dayOk?: boolean }): GateDecision {
  if (!input.switchOn || !input.trialing) return "delegate";
  if (input.hourOk === false) return "hour_limit";
  if (input.dayOk === false) return "day_limit";
  return "delegate";
}

/** The refusal body: what TransitionDemo already turns into the wall. Pure. */
export function gateRefusal(decision: Exclude<GateDecision, "delegate">, limits: { hour: number; day: number }) {
  return decision === "hour_limit"
    ? { error: `Your free week covers stories. Statements are ${limits.hour} an hour until your plan starts.`, code: "free_limit", limit: "hour" as const, payToday: true }
    : { error: `Your free week covers stories. Statements are ${limits.day} a day until your plan starts.`, code: "free_limit", limit: "day" as const, payToday: true };
}
