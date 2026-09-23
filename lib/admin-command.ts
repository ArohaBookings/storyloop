import type Stripe from "stripe";
import { unstable_cache } from "next/cache";
import { createStripe } from "@/lib/stripe-client";
import { PLAN_ORDER } from "@/lib/plans";
import type { SubscriptionFacts } from "@/lib/billing-risk";

/**
 * Everything the admin command centre reads from Stripe, in one pass, cached
 * for five minutes.
 *
 * The Stripe account is shared with other businesses, so every list is
 * filtered down to StoryLoop: a subscription or checkout counts only when its
 * metadata names a StoryLoop plan AND a user id that is a StoryLoop profile; an
 * invoice or dispute counts only when its customer is a StoryLoop customer.
 * Read-only: nothing here writes to Stripe.
 */

const PAID_PLANS = new Set<string>(PLAN_ORDER.filter((plan) => plan !== "free"));
const DAY = 86_400;

export type StripeSubscriptionRow = {
  id: string;
  userId: string;
  customerId: string;
  plan: string;
  status: string;
  currency: "NZD" | "AUD" | string;
  monthly: number;
  created: number;
  offer: string | null;
  founding: boolean;
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  facts: SubscriptionFacts;
};

export type StripeCheckoutRow = {
  id: string;
  userId: string;
  plan: string;
  status: string;
  created: number;
  expiresAt: number;
  amountTotal: number | null;
  currency: string | null;
  offer: string | null;
};

export type StripeInvoiceRow = {
  id: string;
  customerId: string;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  attemptCount: number;
  nextAttempt: number | null;
  hostedUrl: string | null;
  billingReason: string | null;
};

export type StripeSnapshot = {
  ok: boolean;
  error: string | null;
  fetchedAt: string;
  subscriptions: StripeSubscriptionRow[];
  checkouts: StripeCheckoutRow[];
  invoices: StripeInvoiceRow[];
  disputes: Array<{ id: string; customerId: string | null; amount: number; currency: string; status: string; reason: string; dueBy: number | null; created: number }>;
  ignoredForeign: number;
};

function symbol(currency: string) {
  const code = currency.toUpperCase();
  return code === "NZD" ? "NZ$" : code === "AUD" ? "A$" : `${code} `;
}

function monthlyOf(subscription: Stripe.Subscription, applyDiscount: boolean) {
  let cents = 0;
  for (const item of subscription.items.data) {
    const unit = item.price?.unit_amount ?? 0;
    const interval = item.price?.recurring?.interval ?? "month";
    const count = Math.max(1, item.price?.recurring?.interval_count ?? 1);
    const perMonth = interval === "year" ? unit / (12 * count) : interval === "week" ? (unit * 52) / (12 * count) : unit / count;
    cents += perMonth * (item.quantity ?? 1);
  }
  let discounted = cents;
  if (applyDiscount) {
    for (const discount of subscription.discounts ?? []) {
      if (typeof discount === "string") continue;
      const coupon = discount.source?.coupon;
      if (!coupon || typeof coupon === "string") continue;
      if (typeof discount.end === "number" && discount.end * 1000 < Date.now()) continue;
      if (typeof coupon.percent_off === "number") discounted *= 1 - coupon.percent_off / 100;
      else if (typeof coupon.amount_off === "number") discounted -= coupon.amount_off;
    }
  }
  return { full: Math.round(cents) / 100, now: Math.max(0, Math.round(discounted)) / 100 };
}

function cardOf(subscription: Stripe.Subscription) {
  const fromSub = subscription.default_payment_method;
  const customer = typeof subscription.customer === "object" && subscription.customer && !("deleted" in subscription.customer && subscription.customer.deleted)
    ? (subscription.customer as Stripe.Customer)
    : null;
  const fromCustomer = customer?.invoice_settings?.default_payment_method;
  const method = [fromSub, fromCustomer].find((pm) => pm && typeof pm === "object") as Stripe.PaymentMethod | undefined;
  if (method?.card) {
    return { brand: method.card.brand, last4: method.card.last4, expMonth: method.card.exp_month, expYear: method.card.exp_year };
  }
  return null;
}

async function collect<T>(iterable: AsyncIterable<T>, max: number): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) {
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

async function fetchSnapshot(storyLoopUserIds: string[], storyLoopCustomerIds: string[]): Promise<StripeSnapshot> {
  const empty: StripeSnapshot = { ok: false, error: null, fetchedAt: new Date().toISOString(), subscriptions: [], checkouts: [], invoices: [], disputes: [], ignoredForeign: 0 };
  if (!process.env.STRIPE_SECRET_KEY) return { ...empty, error: "STRIPE_SECRET_KEY is not configured" };
  const users = new Set(storyLoopUserIds);
  const customers = new Set(storyLoopCustomerIds);
  try {
    const stripe = createStripe();
    const now = Math.floor(Date.now() / 1000);
    const since = now - 45 * DAY;

    const [subscriptions, sessions, invoices, disputes] = await Promise.all([
      collect(
        stripe.subscriptions.list({
          status: "all",
          limit: 100,
          expand: ["data.default_payment_method", "data.latest_invoice", "data.customer", "data.customer.invoice_settings.default_payment_method", "data.discounts", "data.discounts.source.coupon"],
        }),
        1500,
      ),
      collect(stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 }), 800),
      collect(stripe.invoices.list({ created: { gte: since }, limit: 100 }), 1500),
      collect(stripe.disputes.list({ limit: 100, expand: ["data.charge"] }), 300),
    ]);

    let ignoredForeign = 0;
    const openDisputesByCustomer = new Map<string, number>();
    const disputeRows: StripeSnapshot["disputes"] = [];
    for (const dispute of disputes) {
      const charge = typeof dispute.charge === "object" ? dispute.charge : null;
      const customerId = typeof charge?.customer === "string" ? charge.customer : charge?.customer?.id ?? null;
      if (!customerId || !customers.has(customerId)) continue;
      const open = ["needs_response", "under_review", "warning_needs_response", "warning_under_review"].includes(dispute.status);
      if (open) openDisputesByCustomer.set(customerId, (openDisputesByCustomer.get(customerId) ?? 0) + 1);
      disputeRows.push({
        id: dispute.id,
        customerId,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        status: dispute.status,
        reason: dispute.reason,
        dueBy: dispute.evidence_details?.due_by ?? null,
        created: dispute.created,
      });
    }

    const subscriptionRows: StripeSubscriptionRow[] = [];
    for (const subscription of subscriptions) {
      const userId = subscription.metadata?.user_id;
      const plan = subscription.metadata?.plan;
      if (!userId || !plan || !PAID_PLANS.has(plan) || !users.has(userId)) {
        ignoredForeign += 1;
        continue;
      }
      // Ended subscriptions older than the window are history, not risk.
      if ((subscription.status === "canceled" || subscription.status === "incomplete_expired") && (subscription.ended_at ?? 0) < since) continue;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const amounts = monthlyOf(subscription, true);
      const full = monthlyOf(subscription, false).full;
      const periodEnd = subscription.items.data.length ? Math.max(...subscription.items.data.map((item) => item.current_period_end)) : null;
      const latest = typeof subscription.latest_invoice === "object" && subscription.latest_invoice ? subscription.latest_invoice : null;
      const discountEnd = (subscription.discounts ?? [])
        .map((discount) => (typeof discount === "object" ? discount.end : null))
        .find((end): end is number => typeof end === "number" && end > now) ?? null;
      const card = cardOf(subscription);
      const currency = subscription.currency.toUpperCase();
      subscriptionRows.push({
        id: subscription.id,
        userId,
        customerId,
        plan,
        status: subscription.status,
        currency,
        monthly: amounts.now,
        created: subscription.created,
        offer: subscription.metadata?.offer_id ?? null,
        founding: subscription.metadata?.founding_centre === "true",
        card,
        facts: {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at ?? null,
          periodEnd,
          trialEnd: subscription.trial_end ?? null,
          trialCancelsWithoutCard: subscription.trial_settings?.end_behavior?.missing_payment_method === "cancel",
          hasCard: Boolean(card),
          card: card ? { expMonth: card.expMonth, expYear: card.expYear } : null,
          latestInvoice: latest
            ? { status: latest.status ?? null, attemptCount: latest.attempt_count, nextAttempt: latest.next_payment_attempt ?? null, amountDue: latest.amount_due / 100 }
            : null,
          discountEnds: discountEnd ? { at: discountEnd, from: amounts.now, to: full } : null,
          openDisputes: openDisputesByCustomer.get(customerId) ?? 0,
          cancellationFeedback: subscription.cancellation_details?.feedback ?? null,
          monthly: amounts.now,
          currencySymbol: symbol(currency),
        },
      });
    }

    const checkoutRows: StripeCheckoutRow[] = sessions
      .filter((session) => {
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        return session.mode === "subscription" && Boolean(userId && plan && PAID_PLANS.has(plan) && users.has(userId));
      })
      .map((session) => ({
        id: session.id,
        userId: session.metadata!.user_id,
        plan: session.metadata!.plan,
        status: session.status ?? "unknown",
        created: session.created,
        expiresAt: session.expires_at,
        amountTotal: session.amount_total != null ? session.amount_total / 100 : null,
        currency: session.currency,
        offer: session.metadata?.offer_id ?? null,
      }));

    const invoiceRows: StripeInvoiceRow[] = invoices
      .filter((invoice) => {
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        return Boolean(customerId && customers.has(customerId));
      })
      .map((invoice) => ({
        id: invoice.id ?? "",
        customerId: (typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id) ?? "",
        status: invoice.status ?? null,
        amountDue: invoice.amount_due / 100,
        amountPaid: invoice.amount_paid / 100,
        currency: invoice.currency,
        created: invoice.created,
        attemptCount: invoice.attempt_count,
        nextAttempt: invoice.next_payment_attempt ?? null,
        hostedUrl: invoice.hosted_invoice_url ?? null,
        billingReason: invoice.billing_reason ?? null,
      }));

    return { ok: true, error: null, fetchedAt: new Date().toISOString(), subscriptions: subscriptionRows, checkouts: checkoutRows, invoices: invoiceRows, disputes: disputeRows, ignoredForeign };
  } catch (error) {
    console.error("Admin Stripe snapshot failed:", error);
    return { ...empty, error: error instanceof Error ? error.message : "Stripe could not be reached" };
  }
}

/** Cached for five minutes; ?fresh=1 on the page bypasses it. */
export const loadStripeSnapshot = unstable_cache(fetchSnapshot, ["admin-command-stripe-v1"], { revalidate: 300 });
export const loadStripeSnapshotFresh = fetchSnapshot;
