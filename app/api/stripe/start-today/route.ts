import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { STATEMENTS_PAY_TODAY } from "@/lib/build-switches";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { updateProfileForSubscription } from "@/lib/stripe-profile-sync";
import { canStartToday, currencyFromStripe, startTodayFailure, startTodayLine } from "@/lib/start-today";

/**
 * "Start my plan today" (lib/start-today.ts).
 *   GET  -> { eligible, todayCents, monthlyCents, currency, line } : what the
 *          wall states before the tap, from Stripe's own preview.
 *   POST -> { ok: true } | { error, code: declined | needs_action | not_eligible | failed, hostedInvoiceUrl? }
 * Stripe ends the free week, invoices at once and charges the card on file;
 * with error_if_incomplete a declined card changes nothing.
 */
async function load() {
  if (!STATEMENTS_PAY_TODAY) return { fail: "not_eligible" as const, response: NextResponse.json({ error: "Not available.", code: "not_eligible" }, { status: 404 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { fail: "unauthenticated" as const, response: NextResponse.json({ error: "Sign in first.", code: "unauthenticated" }, { status: 401 }) };
  const profile = await getOrCreateProfile(user);
  if (!profile.stripe_subscription_id) return { fail: "not_eligible" as const, response: NextResponse.json({ eligible: false, code: "not_eligible" }) };
  const stripe = createStripe();
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  } catch {
    return { fail: "not_eligible" as const, response: NextResponse.json({ eligible: false, code: "not_eligible" }) };
  }
  if (!canStartToday(profile, sub)) return { fail: "not_eligible" as const, response: NextResponse.json({ eligible: false, code: "not_eligible" }) };
  return { user, profile, stripe, sub };
}

export async function GET() {
  const loaded = await load();
  if ("fail" in loaded) return loaded.response;
  const { stripe, sub } = loaded;
  try {
    const preview = await stripe.invoices.createPreview({ subscription: sub.id, subscription_details: { trial_end: "now" } });
    const currency = currencyFromStripe(preview.currency ?? sub.currency);
    const monthlyCents = sub.items.data[0]?.price?.unit_amount ?? null;
    if (!currency || monthlyCents === null) return NextResponse.json({ eligible: false, code: "not_eligible" });
    return NextResponse.json({ eligible: true, todayCents: preview.amount_due, monthlyCents, currency, line: startTodayLine(preview.amount_due, monthlyCents, currency) });
  } catch (error) {
    console.error("Start-today preview failed:", error);
    // No amount, no button: the wall falls back to Billing.
    return NextResponse.json({ eligible: false, code: "failed" });
  }
}

export async function POST() {
  const loaded = await load();
  if ("fail" in loaded) {
    if (loaded.fail === "not_eligible") return NextResponse.json({ error: "Your plan has already started, or it is not one this can start. See Billing.", code: "not_eligible" }, { status: 409 });
    return loaded.response;
  }
  const { user, stripe, sub } = loaded;
  if (!(await consumeRateLimit({ scope: "start-today", key: user.id, limit: 5, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "Too many tries. Wait a little, or go to Billing.", code: "failed" }, { status: 429 });
  }
  // The key names the card too: Stripe replays a declined answer for its key for 24 hours,
  // so after she updates her card on Billing the next tap must be a new request. A double
  // tap on the same card is one request; after success the trialing check refuses a second.
  let cardId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id ?? null;
  if (!cardId) {
    try {
      const customer = await stripe.customers.retrieve(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
      const pm = "deleted" in customer && customer.deleted ? null : customer.invoice_settings?.default_payment_method;
      cardId = typeof pm === "string" ? pm : pm?.id ?? null;
    } catch { /* the key without it */ }
  }
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(
      sub.id,
      { trial_end: "now", proration_behavior: "none", payment_behavior: "error_if_incomplete" },
      { idempotencyKey: `start-today-${sub.id}-${cardId ?? "none"}` },
    );
  } catch (error) {
    const failure = startTodayFailure(error);
    if (failure.code === "needs_action") {
      // Her bank wants her to confirm: Stripe's own page for the invoice.
      let hostedInvoiceUrl: string | null = null;
      try {
        const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 1 });
        hostedInvoiceUrl = invoices.data[0]?.hosted_invoice_url ?? null;
      } catch { /* Billing instead */ }
      return NextResponse.json({ error: "Your bank wants you to confirm this payment.", code: "needs_action", needsAction: true, hostedInvoiceUrl }, { status: 402 });
    }
    if (failure.code === "declined") {
      return NextResponse.json({ error: "Your card was declined. Update it on Billing.", code: "declined" }, { status: 402 });
    }
    console.error("Start-today failed:", error);
    return NextResponse.json({ error: "That did not go through. Nothing was charged. Try again, or go to Billing.", code: "failed" }, { status: 502 });
  }

  const admin = createAdminSupabase();
  // The same write the webhook makes (it repeats it; idempotent), so statements open at once.
  await updateProfileForSubscription(admin, updated, { userId: user.id }).catch((error) => console.error("Start-today profile sync failed:", error));
  const currency = currencyFromStripe(updated.currency);
  let amountCents = 0;
  try {
    const latest = typeof updated.latest_invoice === "string" ? await stripe.invoices.retrieve(updated.latest_invoice) : updated.latest_invoice;
    amountCents = latest?.amount_paid ?? 0;
  } catch { /* the count only */ }
  await recordServerEvent(admin, {
    event: "statement_plan_started",
    userId: user.id,
    path: "/api/stripe/start-today",
    metadata: { from: "trial", currency: currency ?? undefined, amount_cents: amountCents },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, status: updated.status });
}
