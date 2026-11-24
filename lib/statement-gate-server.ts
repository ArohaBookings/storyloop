import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { STATEMENTS_PAY_TODAY } from "@/lib/build-switches";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { consumeRateLimit } from "@/lib/rate-limit";
import { STATEMENT_FREE_DAY_LIMIT, STATEMENT_FREE_LIMIT, STATEMENT_FREE_WINDOW_SECONDS } from "@/lib/child-statement";
import { gateDecision, gateRefusal, isTrialingIndividual } from "@/lib/statement-gate";

type Supabase = Awaited<ReturnType<typeof createClient>>;

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
    if (!isTrialingIndividual(profile)) return inner(untouched);
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
