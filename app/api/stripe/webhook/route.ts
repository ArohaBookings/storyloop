import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { createStripe } from "@/lib/stripe-client";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey } from "@/lib/plans";
import { creditEarnedReferrals, grantReferralCreditForPayment } from "@/lib/referrals";
import { newlyScheduledCancellation, paymentFailureNotice, sendBillingEmail } from "@/lib/email/billing";
import { cancellationFeedbackMetadata } from "@/lib/churn-reasons";
import { metaConfigured, sendMetaEvent } from "@/lib/meta-capi";
import { trialLapsedWithoutCard } from "@/lib/centre-offer";
import { SITE_URL } from "@/lib/email/config";
import { recordServerEvent } from "@/lib/analytics/server";
import { PLAN_ORDER } from "@/lib/plans";
import { stripeEventFacts, type StripeEventFacts } from "@/lib/stripe-events";

function getStripe() {
  return createStripe();
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

/**
 * A referred user has actually paid money, so their referrer has earned a free
 * month. Deliberately runs only on a paid invoice, never on signup or trial
 * start, and only when real money moved (amount_paid > 0) so a fully discounted
 * or zero invoice cannot mint a reward.
 *
 * Failures here must never fail the webhook: billing state is the important
 * part of this handler, the reward is secondary and can be retried.
 */
async function grantReferralRewardIfEarned(
  admin: ReturnType<typeof createAdminSupabase>,
  invoice: Stripe.Invoice
) {
  try {
    if ((invoice.amount_paid ?? 0) <= 0) return;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const { data: payer } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (!payer?.id) return;

    const invoiceId = invoice.id ?? `inv_${Date.now()}`;
    const result = await grantReferralCreditForPayment(getStripe(), payer.id, invoiceId);
    if (result.granted) {
      console.info("Referral credit granted", {
        referrerId: result.referrerId,
        amountCents: result.amountCents,
        currency: result.currency,
      });
    }

    // And pay out anything THIS payer earned back when they had no plan of
    // their own to put it against. An educator who brought their centre aboard
    // while on the free plan collects the moment they subscribe.
    const settled = await creditEarnedReferrals(getStripe(), payer.id, invoiceId);
    if (settled.credited) {
      console.info("Earned referrals settled", { referrerId: payer.id, ...settled });
    }
  } catch (error) {
    console.error("Referral reward check failed (billing unaffected):", error);
  }
}

async function handleInvoicePaid(admin: ReturnType<typeof createAdminSupabase>, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const subscriptionId = invoiceSubscriptionId(invoice);

  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    await updateProfileForSubscription(admin, subscription, { customerId });
    await grantReferralRewardIfEarned(admin, invoice);
    // Receipt last: the subscription record is what matters, and sendBillingEmail
    // never throws, so this cannot cost us a state update.
    await sendBillingEmail({
      admin,
      type: "payment_succeeded",
      billingKey: invoice.id ?? `sub_${subscriptionId}_${invoice.period_end ?? 0}`,
      userId: subscription.metadata?.user_id,
      customerId,
      amountInCents: invoice.amount_paid,
      currency: invoice.currency,
      renewsAtSeconds: subscriptionPeriodEnd(subscription),
    });
    return;
  }

  await updateProfileByInvoiceCustomer(admin, invoice, { subscription_status: "active" });
  await grantReferralRewardIfEarned(admin, invoice);
  await sendBillingEmail({
    admin,
    type: "payment_succeeded",
    billingKey: invoice.id ?? `inv_${customerId}_${invoice.period_end ?? 0}`,
    customerId,
    amountInCents: invoice.amount_paid,
    currency: invoice.currency,
  });
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

  // At most two notices per invoice, never one per retry. Stripe fires this
  // event on every attempt. While retries remain, the first failure gets one
  // "update your card" email and later attempts are deduped by the invoice key.
  // When no retry is left, access to NEW stories actually stops, so that moment
  // gets its own notice under a separate key; the invoice key alone would
  // swallow it as a duplicate of the first.
  const notice = paymentFailureNotice(
    invoice.id ?? `failed_${customerId}_${invoice.period_end ?? 0}`,
    nextAttemptAt,
  );
  await sendBillingEmail({
    admin,
    type: notice.type,
    billingKey: notice.billingKey,
    userId: subscription?.metadata?.user_id,
    customerId,
    amountInCents: invoice.amount_due,
    currency: invoice.currency,
  });
}

/**
 * Tell Meta a trial started, if this person came from a Facebook or Instagram
 * ad click and Meta measurement is on. Scheduled with after(), so it runs once
 * the webhook has answered Stripe, and every failure is swallowed.
 */
function reportTrialToMeta(admin: ReturnType<typeof createAdminSupabase>, userId: string | undefined, subscriptionId: string) {
  if (!userId || !metaConfigured()) return;
  // Even scheduling it is guarded: nothing here may ever throw into billing.
  try {
    after(async () => {
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        const fbc = data.user?.user_metadata?.meta_fbc;
        await sendMetaEvent({
          eventName: "StartTrial",
          eventId: `trial:${subscriptionId}`,
          userId,
          fbc,
          userAgent: null,
          actionSource: "system_generated",
          sourceUrl: `${SITE_URL}/billing`,
        });
      } catch (error) {
        console.error("Meta trial report skipped:", error);
      }
    });
  } catch (error) {
    console.error("Meta trial report not scheduled:", error);
  }
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
      // After the billing write, after the response, and a no-op unless Meta
      // measurement is switched on. It cannot affect the subscription.
      reportTrialToMeta(admin, session.metadata?.user_id, subscription.id);
      await recordStoryLoopCheckout(admin, session, subscription);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateProfileForSubscription(admin, subscription);

      // They just cancelled in the portal. Access runs to the period end, so
      // tell them exactly that while keeping the plan still costs nothing.
      // After the state write, and sendBillingEmail never throws.
      if (event.type === "customer.subscription.updated") {
        const previous = (event.data as { previous_attributes?: Record<string, unknown> }).previous_attributes;
        const scheduled = newlyScheduledCancellation(subscription, previous, subscriptionPeriodEnd(subscription));
        if (scheduled) {
          await sendBillingEmail({
            admin,
            type: "cancellation_scheduled",
            billingKey: scheduled.billingKey,
            userId: subscription.metadata?.user_id,
            customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
            endsAtSeconds: scheduled.endsAtSeconds,
            // The reason they picked in the portal, for the admin dashboard.
            extraMetadata: cancellationFeedbackMetadata(subscription.cancellation_details),
          });
        }
      }
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

      // Confirm it has ended and what the free plan keeps. A centre's no-card
      // free month running out is worded as the end of a trial, not a
      // cancellation: nothing was ever charged.
      const trialLapsed = trialLapsedWithoutCard(subscription);
      await sendBillingEmail({
        admin,
        type: "subscription_cancelled",
        billingKey: subscription.id,
        userId,
        customerId,
        trialLapsed,
        extraMetadata: {
          ...cancellationFeedbackMetadata(subscription.cancellation_details),
          ...(trialLapsed ? { ended_reason: "trial_lapsed_without_card" } : {}),
        },
      });
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

    case "checkout.session.expired": {
      // Opened Stripe and walked away. The abandoned-checkout email already
      // finds these by scanning Stripe; this puts the moment on the funnel.
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.user_id) {
        await recordServerEvent(admin, {
          event: "checkout_expired",
          userId: session.metadata.user_id,
          path: "/api/stripe/webhook",
          metadata: { plan: session.metadata.plan, offer: session.metadata.offer_id, checkout_session: session.id },
        });
      }
      return;
    }

    // Recorded in the event log for the admin page (see logStoryLoopEvent);
    // nothing about the account changes, so nothing else to do here.
    case "customer.subscription.trial_will_end":
    case "invoice.payment_action_required":
    case "invoice.upcoming":
    case "charge.refunded":
    case "charge.dispute.created":
    case "charge.dispute.closed":
    case "customer.updated":
      return;

    default:
      return;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOMER_ID = /^cus_[A-Za-z0-9]+$/;

async function findStoryLoopAccount(admin: ReturnType<typeof createAdminSupabase>, userId: string | null, customerId: string | null) {
  const safeUser = userId && UUID.test(userId) ? userId : null;
  const safeCustomer = customerId && CUSTOMER_ID.test(customerId) ? customerId : null;
  if (!safeUser && !safeCustomer) return null;
  const filters = [safeUser ? `id.eq.${safeUser}` : null, safeCustomer ? `stripe_customer_id.eq.${safeCustomer}` : null].filter(Boolean).join(",");
  const { data, error } = await admin.from("profiles").select("id").or(filters).limit(1);
  if (error) throw error;
  if (data?.[0]?.id) return data[0].id as string;
  if (safeCustomer) {
    const centre = await admin.from("centres").select("id").eq("stripe_customer_id", safeCustomer).limit(1);
    if (!centre.error && centre.data?.length) return "centre";
  }
  return null;
}

/**
 * Whose event is this? The Stripe account is shared with Leo's other
 * businesses and Stripe sends every endpoint every event of a subscribed type,
 * so this webhook also hears their checkouts and invoices. An event is
 * StoryLoop's when its user_id metadata or its customer belongs to a StoryLoop
 * account: exactly the events the handlers above could change anything for.
 * Everything else is answered and dropped, never recorded.
 *
 * A lookup failure throws, so Stripe retries rather than a real StoryLoop
 * event being dropped.
 */
async function storyLoopOwner(admin: ReturnType<typeof createAdminSupabase>, event: Stripe.Event, facts: StripeEventFacts) {
  let customerId = facts.customerId;
  const object = event.data.object as unknown as Record<string, unknown>;
  // A dispute names the charge, not the customer.
  if (!customerId && event.type.startsWith("charge.dispute.") && typeof object.charge === "string") {
    const charge = await getStripe().charges.retrieve(object.charge);
    customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
  }
  const found = await findStoryLoopAccount(admin, facts.userId, customerId);
  if (found) return found;
  // An invoice snapshot without an owner: ask its subscription, as handleInvoicePaid would.
  if (!facts.userId && facts.subscriptionId && event.type.startsWith("invoice.")) {
    const subscription = await getStripe().subscriptions.retrieve(facts.subscriptionId);
    return findStoryLoopAccount(admin, subscription.metadata?.user_id ?? null, null);
  }
  return null;
}

/** The plain-English line the admin page shows. Never throws. */
async function logStoryLoopEvent(admin: ReturnType<typeof createAdminSupabase>, event: Stripe.Event, facts: StripeEventFacts, owner: string) {
  try {
    await admin
      .from("stripe_webhook_events")
      .update({
        user_id: owner !== "centre" ? owner : facts.userId,
        customer_id: facts.customerId,
        amount: facts.amount,
        currency: facts.currency,
        plan: facts.plan,
        summary: facts.summary,
        stripe_created_at: event.created ? new Date(event.created * 1000).toISOString() : null,
      })
      .eq("event_id", event.id);
  } catch (error) {
    console.error("Stripe event log write skipped:", error);
  }
}

/**
 * The end of the checkout funnel, and the offer it redeemed if any.
 *
 * Only for StoryLoop's own sessions: the account's webhook also carries other
 * businesses' checkouts, and those are recognised by not having a StoryLoop
 * user and plan in their metadata. Never throws; the billing write above is
 * what matters, and it has already happened.
 */
async function recordStoryLoopCheckout(admin: ReturnType<typeof createAdminSupabase>, session: Stripe.Checkout.Session, subscription: Stripe.Subscription) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  if (!userId || !plan || !(PLAN_ORDER as string[]).includes(plan)) return;
  try {
    await recordServerEvent(admin, {
      event: "checkout_completed",
      userId,
      path: "/api/stripe/webhook",
      metadata: {
        plan,
        currency: session.metadata?.currency,
        status: subscription.status,
        trial_end: subscription.trial_end ?? undefined,
        amount_total: session.amount_total ?? undefined,
        offer: session.metadata?.offer_id,
        checkout_session: session.id,
      },
    });
    const offerId = session.metadata?.offer_id;
    if (offerId) {
      await admin
        .from("offer_grants")
        .update({ redeemed_at: new Date().toISOString(), stripe_subscription_id: subscription.id })
        .eq("user_id", userId)
        .eq("offer_id", offerId)
        .is("redeemed_at", null);
    }
  } catch (error) {
    console.error("Checkout funnel record failed:", error);
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
    const facts = stripeEventFacts(event as unknown as Parameters<typeof stripeEventFacts>[0]);
    const owner = await storyLoopOwner(admin, event, facts);
    // Another business's event: answered so Stripe stops sending it, and
    // nothing about it is stored.
    if (!owner) return NextResponse.json({ received: true, ignored: "not_storyloop" });

    const shouldProcess = await beginWebhookEvent(admin, event);
    if (!shouldProcess) return NextResponse.json({ received: true, duplicate: true });

    await processStripeEvent(admin, event);
    await finishWebhookEvent(admin, event.id, "processed");
    await logStoryLoopEvent(admin, event, facts, owner);
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
