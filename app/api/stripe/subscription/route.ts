import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { isCancellationReason, setCancellation } from "@/lib/billing-manage";

/**
 * Cancel at the end of the current period (paid month or free month), or keep
 * the plan after all. Nothing ends early and nothing is refunded or charged here;
 * the webhook updates the account and sends the confirmation email.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getOrCreateProfile(user);
    if (!profile?.stripe_customer_id) return NextResponse.json({ ok: false, reason: "no_subscription" }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    if (body.action !== "cancel" && body.action !== "resume") return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    const result = await setCancellation(createStripe(), {
      customerId: profile.stripe_customer_id,
      subscriptionId: profile.stripe_subscription_id ?? null,
      cancel: body.action === "cancel",
      reason: isCancellationReason(body.reason) ? body.reason : null,
      comment: typeof body.comment === "string" ? body.comment.trim() : null,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    console.error("Subscription change error:", error);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
