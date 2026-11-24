// Writes a Stripe subscription onto the StoryLoop profile it belongs to.
// Moved unchanged out of app/api/stripe/webhook/route.ts (25 Nov) so the routes
// that make or change a subscription by API (start-free, start-today) write the
// profile the same way the webhook does. The webhook repeats it; it is idempotent.
import Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey } from "@/lib/plans";

export function stripeDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data.map((item) => item.current_period_end);
  return periodEnds.length ? Math.max(...periodEnds) : subscription.cancel_at;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id;
}

export function normalizeStripeStatus(status: string | null | undefined) {
  if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired" || status === "paused") {
    return "payment_required";
  }
  return status ?? "payment_required";
}

export async function updateProfileForSubscription(
  admin: ReturnType<typeof createAdminSupabase>,
  subscription: Stripe.Subscription,
  fallback?: { userId?: string | null; plan?: string | null; customerId?: string | null }
) {
  const userId = subscription.metadata?.user_id ?? fallback?.userId ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? fallback?.customerId ?? null;
  const plan = normalizePlanKey(subscription.metadata?.plan ?? fallback?.plan ?? "educator");
  const status = normalizeStripeStatus(subscription.status);

  const update = {
    plan,
    subscription_status: status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    trial_ends_at: stripeDate(subscription.trial_end),
    current_period_end: stripeDate(subscriptionPeriodEnd(subscription)),
    upgraded_at: status === "active" || status === "trialing" ? new Date().toISOString() : undefined,
  };

  if (userId) {
    await admin.from("profiles").update(update).eq("id", userId);
    return;
  }

  if (customerId) {
    await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
  }
}
