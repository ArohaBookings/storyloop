import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { isCancellationReason, setCancellation, subscriptionView } from "@/lib/billing-manage";
import { isPauseMonths, pausePayments, restartPayments } from "@/lib/billing-pause";

/**
 * Cancel at the end of the current period (paid month or free month), keep
 * the plan after all, or pause payments for 1-3 months. Nothing ends early and nothing is refunded or charged here;
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
    // Paused payments (from a pause link) can be restarted from Billing too.
    if (body.action === "restart_payments") {
      const stripe = createStripe();
      const restarted = await restartPayments(stripe, { customerId: profile.stripe_customer_id, subscriptionId: profile.stripe_subscription_id ?? null });
      if (!restarted.ok) return NextResponse.json(restarted, { status: 409 });
      const sub = profile.stripe_subscription_id ? await stripe.subscriptions.retrieve(profile.stripe_subscription_id).catch(() => null) : null;
      return NextResponse.json({ ok: true, subscription: sub ? subscriptionView(sub, null) : null });
    }
    // Pause, offered beside Cancel on Billing (20 Oct 2026): the same pause the
    // email link gives (1-3 months, void the skipped invoices, one per 180 days).
    if (body.action === "pause") {
      if (!isPauseMonths(body.months)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
      const stripe = createStripe();
      const paused = await pausePayments(stripe, { customerId: profile.stripe_customer_id, subscriptionId: profile.stripe_subscription_id ?? null, months: body.months });
      if (!paused.ok) return NextResponse.json(paused, { status: 409 });
      console.info(`Billing pause (${body.months} months) for ${profile.id}`);
      return NextResponse.json({ ok: true, pausedUntil: paused.view.pausedUntil });
    }
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
