import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey } from "@/lib/plans";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

function stripeDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data.map((item) => item.current_period_end);
  return periodEnds.length ? Math.max(...periodEnds) : subscription.cancel_at;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return typeof subscription === "string" ? subscription : subscription?.id;
}

function normalizeStripeStatus(status: string | null | undefined) {
  if (status === "unpaid" || status === "incomplete" || status === "incomplete_expired" || status === "paused") {
    return "payment_required";
  }
  return status ?? "payment_required";
}

function isDuplicateError(error: { code?: string; message?: string } | null) {
  return error?.code === "23505" || Boolean(error?.message?.toLowerCase().includes("duplicate"));
}

function isMissingIdempotencyTable(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("stripe_webhook_events") && error.message.includes("does not exist"));
}

async function beginWebhookEvent(admin: ReturnType<typeof createAdminSupabase>, event: Stripe.Event) {
  const { data, error } = await admin.rpc("begin_stripe_webhook_event", {
    p_event_id: event.id,
    p_type: event.type,
  });

  if (!error) return data === "process";

  if (isMissingIdempotencyTable(error)) {
    console.warn("stripe_webhook_events table or RPC missing; processing without idempotency.");
    return true;
  }

  if (isDuplicateError(error)) return false;
  throw error;
}

async function finishWebhookEvent(
  admin: ReturnType<typeof createAdminSupabase>,
  eventId: string,
  status: "processed" | "failed",
  errorMessage?: string
) {
  const { error } = await admin.rpc("finish_stripe_webhook_event", {
    p_event_id: eventId,
    p_status: status,
    p_error: errorMessage?.slice(0, 500) ?? null,
  });
  if (error && !isMissingIdempotencyTable(error)) throw error;
}

async function updateProfileForSubscription(
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

async function updateProfileByInvoiceCustomer(
  admin: ReturnType<typeof createAdminSupabase>,
  invoice: Stripe.Invoice,
  update: Record<string, unknown>
) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
}

async function handleInvoicePaid(admin: ReturnType<typeof createAdminSupabase>, invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await updateProfileForSubscription(admin, subscription, {
      customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    });
    return;
  }

  await updateProfileByInvoiceCustomer(admin, invoice, { subscription_status: "active" });
}

async function handlePaymentFailed(admin: ReturnType<typeof createAdminSupabase>, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const subscriptionId = invoiceSubscriptionId(invoice);
  const nextAttemptAt = stripeDate(invoice.next_payment_attempt);
  const subscription = subscriptionId ? await getStripe().subscriptions.retrieve(subscriptionId) : null;
  const status = nextAttemptAt ? "past_due" : "payment_required";

  const update: Record<string, unknown> = {
    subscription_status: status,
    current_period_end: subscription ? stripeDate(subscriptionPeriodEnd(subscription)) : undefined,
    stripe_subscription_id: subscription?.id,
  };

  await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
}

async function processStripeEvent(admin: ReturnType<typeof createAdminSupabase>, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!subscriptionId) return;
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await updateProfileForSubscription(admin, subscription, {
        userId: session.metadata?.user_id,
        plan: session.metadata?.plan,
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      });
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileForSubscription(admin, subscription);
      return;
    }

    case "customer.subscription.paused": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileForSubscription(admin, { ...subscription, status: "paused" } as Stripe.Subscription);
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const update = {
        plan: "free",
        subscription_status: "cancelled",
        stripe_subscription_id: null,
        current_period_end: stripeDate(subscriptionPeriodEnd(subscription)),
      };
      if (userId) await admin.from("profiles").update(update).eq("id", userId);
      else if (customerId) await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
      return;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      await handleInvoicePaid(admin, event.data.object as Stripe.Invoice);
      return;
    }

    case "invoice.payment_failed": {
      await handlePaymentFailed(admin, event.data.object as Stripe.Invoice);
      return;
    }

    default:
      return;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  try {
    const shouldProcess = await beginWebhookEvent(admin, event);
    if (!shouldProcess) return NextResponse.json({ received: true, duplicate: true });

    await processStripeEvent(admin, event);
    await finishWebhookEvent(admin, event.id, "processed");
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    console.error("Webhook error:", err);
    await finishWebhookEvent(admin, event.id, "failed", message).catch((finishError) => {
      console.error("Could not mark webhook failed:", finishError);
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
