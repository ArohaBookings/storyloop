import { PLAN_ORDER, type PlanKey } from "@/lib/plans";

/**
 * People who reached Stripe Checkout and left without starting their trial.
 *
 * In Stripe, two out of three StoryLoop checkouts expired unfinished (18 expired
 * against 9 completed by September 2026) and nobody heard from us. Checkout
 * sessions expire 24 hours after they open, and StoryLoop's checkout records the
 * user and plan on each one, so the six-hourly email job can find them without
 * any webhook or Stripe setting changes.
 */

export type CheckoutSessionLike = {
  id: string;
  status: string | null;
  created: number;
  metadata?: Record<string, string> | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAID = new Set<string>(PLAN_ORDER.filter((plan) => plan !== "free"));

/** One entry per user: the most recent unfinished StoryLoop checkout in the window. */
export function abandonedCheckoutCandidates(sessions: CheckoutSessionLike[], sinceSeconds: number) {
  const latest = new Map<string, { userId: string; plan: PlanKey; sessionId: string; created: number }>();
  for (const session of sessions) {
    if (session.status !== "expired" || session.created < sinceSeconds) continue;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    if (!userId || !UUID.test(userId) || !plan || !PAID.has(plan)) continue;
    const existing = latest.get(userId);
    if (!existing || session.created > existing.created) {
      latest.set(userId, { userId, plan: plan as PlanKey, sessionId: session.id, created: session.created });
    }
  }
  return [...latest.values()];
}

/** Still worth emailing: a real account that has not since started paying. */
export function stillAbandoned(profile: {
  email?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  is_internal?: boolean | null;
  marketing_unsubscribed_at?: string | null;
}) {
  if (!profile.email || profile.is_internal || profile.marketing_unsubscribed_at) return false;
  if (profile.plan && profile.plan !== "free") return false;
  return !["active", "trialing", "past_due", "admin_override"].includes(profile.subscription_status ?? "");
}
