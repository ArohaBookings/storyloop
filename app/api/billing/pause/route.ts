import { NextRequest, NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isPauseMonths, pausePayments, restartPayments, verifyPauseToken } from "@/lib/billing-pause";

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Pause or restart payments from the signed link in a pause email
 * (lib/billing-pause.ts). Only ever acts on a button press (POST): opening the
 * link changes nothing.
 */
export async function POST(request: NextRequest) {
  const allowed = await consumeRateLimit({ scope: "billing-pause", key: clientIp(request), limit: 10, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const payload = verifyPauseToken(typeof body.token === "string" ? body.token : null);
  if (!payload) return NextResponse.json({ ok: false, reason: "bad_link" }, { status: 401 });
  const action = body.action === "restart" ? "restart" : body.action === "pause" ? "pause" : null;
  if (!action) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  if (action === "pause" && !isPauseMonths(body.months)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  try {
    const { data: profile } = await createAdminSupabase()
      .from("profiles")
      .select("id, stripe_customer_id, stripe_subscription_id, is_active")
      .eq("id", payload.userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id || profile.is_active === false) {
      return NextResponse.json({ ok: false, reason: "no_subscription" }, { status: 404 });
    }
    const stripe = createStripe();
    const input = { customerId: profile.stripe_customer_id, subscriptionId: profile.stripe_subscription_id ?? null };
    const result = action === "pause"
      ? await pausePayments(stripe, { ...input, months: Number(body.months) as 1 | 2 | 3 })
      : await restartPayments(stripe, input);
    if (result.ok) console.info(`Billing ${action} for ${payload.userId}`);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (error) {
    console.error("Billing pause error:", error);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
