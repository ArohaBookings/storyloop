import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { STATEMENTS_PAY_TODAY } from "@/lib/build-switches";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { consumeRateLimit } from "@/lib/rate-limit";
import { STATEMENT_FREE_DAY_LIMIT, STATEMENT_FREE_LIMIT, STATEMENT_FREE_WINDOW_SECONDS } from "@/lib/child-statement";
import { gateDecision, gateRefusal, isFreeWeekProfile, isTrialingIndividual, type GateProfile } from "@/lib/statement-gate";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PRO_MONTH_OFFER_ID } from "@/lib/offers";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Her own account is in the 7-day free week, so statements past the free
 * allowance need her plan (R1-2, 25 Nov review): not the free month of Pro (its
 * redeemed grant names this subscription), not any trial with more than a week
 * to run. Also used by the child page so its drafter shows the wall (R1-3).
 */
export async function isGatedFreeWeek(userId: string, profile: GateProfile): Promise<boolean> {
  if (!STATEMENTS_PAY_TODAY || !isTrialingIndividual(profile)) return false;
  const admin = createAdminSupabase();
  const [{ data: proMonth }, { data: trial }] = await Promise.all([
    admin.from("offer_grants").select("stripe_subscription_id").eq("user_id", userId).eq("offer_id", PRO_MONTH_OFFER_ID).not("redeemed_at", "is", null).maybeSingle(),
    admin.from("profiles").select("trial_ends_at").eq("id", userId).maybeSingle(),
  ]);
  const proMonthSubscriptionId = typeof proMonth?.stripe_subscription_id === "string" ? proMonth.stripe_subscription_id : null;
  const trialEndsAt = typeof trial?.trial_ends_at === "string" ? trial.trial_ends_at : null;
  return isFreeWeekProfile({ ...profile, trial_ends_at: trialEndsAt }, { now: new Date(), proMonthSubscriptionId });
}

/**
 * The gate in front of a protected statement route (lib/statement-gate.ts).
 * The protected handler always gets an untouched copy of the request; only a
 * trialing individual account is counted here, on the free account's own two
 * counters, and only when her request would reach the protected route's own
 * counter (`counts` repeats that route's checks, so a too-short paste or a
 * child with too few stories costs nothing, as it does there).
 */
export async function gateStatement(
  request: NextRequest,
  inner: (request: NextRequest) => Promise<Response>,
  counts: (input: { user: User; body: Record<string, unknown>; supabase: Supabase }) => Promise<boolean>,
): Promise<Response> {
  if (!STATEMENTS_PAY_TODAY) return inner(request);
  // Her request, read once, rebuilt byte for byte for the protected handler
  // (request.clone() gives a plain Request that NextRequest cannot wrap in a production build).
  const raw = await request.text();
  const untouched = new NextRequest(request.url, { method: request.method, headers: request.headers, body: raw });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return inner(untouched);
    const profile = await getOrCreateProfile(user);
    if (!(await isGatedFreeWeek(user.id, profile))) return inner(untouched);
    let body: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch { /* the protected route answers a bad body itself */ }
    if (!(await counts({ user, body, supabase }))) return inner(untouched);
    const hourOk = await consumeRateLimit({ scope: "child-statement-free", key: user.id, limit: STATEMENT_FREE_LIMIT, windowSeconds: STATEMENT_FREE_WINDOW_SECONDS });
    const dayOk = !hourOk || (await consumeRateLimit({ scope: "child-statement-free-day", key: user.id, limit: STATEMENT_FREE_DAY_LIMIT, windowSeconds: 86_400 }));
    const decision = gateDecision({ switchOn: true, trialing: true, hourOk, dayOk });
    if (decision === "delegate") return inner(untouched);
    return NextResponse.json(gateRefusal(decision, { hour: STATEMENT_FREE_LIMIT, day: STATEMENT_FREE_DAY_LIMIT }), { status: 429 });
  } catch (error) {
    // The gate must never stop a statement on its own fault: the protected route decides.
    console.error("Statement gate failed, passing through:", error);
    return inner(untouched);
  }
}
