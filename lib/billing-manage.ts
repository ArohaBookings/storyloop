import type Stripe from "stripe";
import { CHECKOUT_BRANDING, CHECKOUT_PRESENTATION, cardUpdateMessages, isBrandingRefusal } from "@/lib/stripe-branding";

/**
 * StoryLoop's own billing management: the card on file, cancelling or keeping
 * a plan, and receipts, all inside StoryLoop.
 *
 * WHY NOT STRIPE'S CUSTOMER PORTAL. The Stripe account is shared with Leo's
 * other businesses, and the portal always shows the account's business name and
 * logo ("<account name>", "Return to <account name>"). It cannot be rebranded
 * per business, and renaming the account would change every other business on
 * it. A StoryLoop customer must never see another business's name, so StoryLoop
 * never sends anyone to the portal. Card entry uses Stripe Checkout in setup
 * mode, which IS branded per session (StoryLoop's name, logo and colours).
 *
 * OWNERSHIP. Every action is scoped to the signed-in account: a subscription is
 * only touched when its customer is the account's own Stripe customer, and a
 * receipt is only shown to the customer it belongs to.
 */

export type BillingCard = { brand: string; last4: string; expMonth: number | null; expYear: number | null } | null;

export type BillingReceipt = {
  id: string;
  number: string | null;
  paidAt: string | null;
  createdAt: string;
  amount: number;
  currency: string;
  status: "paid" | "open";
};

export type BillingSubscription = {
  id: string;
  status: string;
  currency: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** When a scheduled cancellation takes effect. */
  endsAt: string | null;
  nextPayment: { date: string; amount: number; currency: string } | null;
};

export type BillingSummary = {
  subscription: BillingSubscription | null;
  card: BillingCard;
  receipts: BillingReceipt[];
};

const MANAGEABLE = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);
const OVERDUE = new Set(["past_due", "unpaid"]);

export const CANCELLATION_REASONS = [
  ["too_expensive", "It costs too much"],
  ["unused", "I'm not using it enough"],
  ["missing_features", "It's missing something I need"],
  ["low_quality", "The drafts aren't good enough"],
  ["too_complex", "It's too complicated"],
  ["switched_service", "I'm using something else"],
  ["customer_service", "I had a problem with support"],
  ["other", "Something else"],
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number][0];

export function isCancellationReason(value: unknown): value is CancellationReason {
  return CANCELLATION_REASONS.some(([key]) => key === value);
}

const iso = (seconds: number | null | undefined) => (typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000).toISOString() : null);
const idOf = (value: string | { id?: string } | null | undefined) => (typeof value === "string" ? value : value?.id ?? null);

/** Whether a subscription belongs to this Stripe customer. Pure. */
export function ownsSubscription(customerId: string | null | undefined, sub: { customer: string | { id?: string } | null }): boolean {
  return Boolean(customerId) && idOf(sub.customer) === customerId;
}

/** The card details from a PaymentMethod or a legacy card source. Pure. */
export function cardFrom(source: unknown): BillingCard {
  if (!source || typeof source !== "object") return null;
  const value = source as { card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number }; brand?: string; last4?: string; exp_month?: number; exp_year?: number; object?: string };
  const card = value.card ?? (value.object === "card" ? value : null);
  if (!card?.last4) return null;
  return { brand: card.brand ?? "card", last4: card.last4, expMonth: card.exp_month ?? null, expYear: card.exp_year ?? null };
}

/** Receipts worth showing: invoices paid with money, and any still open. Pure. */
export function receiptsFrom(invoices: Array<Pick<Stripe.Invoice, "id" | "number" | "status" | "amount_paid" | "amount_due" | "currency" | "created"> & { status_transitions?: { paid_at?: number | null } | null }>): BillingReceipt[] {
  const rows: BillingReceipt[] = [];
  for (const invoice of invoices) {
    if (!invoice.id) continue;
    if (invoice.status === "paid" && (invoice.amount_paid ?? 0) > 0) {
      rows.push({ id: invoice.id, number: invoice.number ?? null, paidAt: iso(invoice.status_transitions?.paid_at), createdAt: iso(invoice.created) ?? new Date(0).toISOString(), amount: invoice.amount_paid, currency: invoice.currency, status: "paid" });
    } else if (invoice.status === "open" && (invoice.amount_due ?? 0) > 0) {
      rows.push({ id: invoice.id, number: invoice.number ?? null, paidAt: null, createdAt: iso(invoice.created) ?? new Date(0).toISOString(), amount: invoice.amount_due, currency: invoice.currency, status: "open" });
    }
  }
  return rows;
}

function periodEnd(sub: Stripe.Subscription): number | null {
  const fromItems = sub.items?.data?.map((item) => (item as { current_period_end?: number }).current_period_end).filter((value): value is number => typeof value === "number");
  if (fromItems?.length) return Math.max(...fromItems);
  return (sub as { current_period_end?: number }).current_period_end ?? null;
}

/** The subscription as the Billing page shows it. Pure apart from the inputs. */
export function subscriptionView(sub: Stripe.Subscription, nextPayment: BillingSubscription["nextPayment"]): BillingSubscription {
  const end = periodEnd(sub);
  const endsAt = sub.cancel_at ? iso(sub.cancel_at) : sub.cancel_at_period_end ? iso(end) : null;
  return {
    id: sub.id,
    status: sub.status,
    currency: sub.currency,
    trialEndsAt: sub.status === "trialing" ? iso(sub.trial_end) : null,
    currentPeriodEnd: iso(end),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    endsAt,
    nextPayment: endsAt ? null : nextPayment,
  };
}

/** This account's live StoryLoop subscription, if any (never another customer's). */
export async function findManageableSubscription(stripe: Stripe, customerId: string, preferredId?: string | null): Promise<Stripe.Subscription | null> {
  if (preferredId) {
    try {
      const sub = await stripe.subscriptions.retrieve(preferredId);
      if (ownsSubscription(customerId, sub) && MANAGEABLE.has(sub.status)) return sub;
    } catch {
      // Fall through to the customer's list.
    }
  }
  const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return list.data.find((sub) => MANAGEABLE.has(sub.status)) ?? null;
}

async function currentCard(stripe: Stripe, customerId: string, sub: Stripe.Subscription | null): Promise<BillingCard> {
  const fromSub = sub?.default_payment_method;
  if (fromSub) {
    const pm = typeof fromSub === "string" ? await stripe.paymentMethods.retrieve(fromSub) : fromSub;
    const card = cardFrom(pm);
    if (card) return card;
  }
  const customer = await stripe.customers.retrieve(customerId, { expand: ["invoice_settings.default_payment_method", "default_source"] });
  if ("deleted" in customer && customer.deleted) return null;
  const full = customer as Stripe.Customer;
  return cardFrom(full.invoice_settings?.default_payment_method) ?? cardFrom(full.default_source);
}

async function nextPaymentFor(stripe: Stripe, sub: Stripe.Subscription): Promise<BillingSubscription["nextPayment"]> {
  if (sub.cancel_at_period_end || sub.cancel_at) return null;
  try {
    const preview = await stripe.invoices.createPreview({ subscription: sub.id });
    const when = preview.next_payment_attempt ?? preview.period_end ?? null;
    if (!when) return null;
    return { date: iso(when) as string, amount: preview.amount_due, currency: preview.currency };
  } catch {
    // A no-card free month that will simply end has no next payment.
    return null;
  }
}

export async function loadBillingSummary(stripe: Stripe, customerId: string, preferredSubscriptionId?: string | null): Promise<BillingSummary> {
  const sub = await findManageableSubscription(stripe, customerId, preferredSubscriptionId);
  const [card, nextPayment, invoices] = await Promise.all([
    currentCard(stripe, customerId, sub),
    sub ? nextPaymentFor(stripe, sub) : Promise.resolve(null),
    stripe.invoices.list({ customer: customerId, limit: 24 }),
  ]);
  // A free month with no card has no next payment: it simply ends.
  const next = !card && sub?.status === "trialing" ? null : nextPayment;
  return {
    subscription: sub ? subscriptionView(sub, next) : null,
    card,
    receipts: receiptsFrom(invoices.data),
  };
}

/** The StoryLoop card page: Stripe Checkout in setup mode, StoryLoop-branded. */
export async function createCardUpdateSession(stripe: Stripe, input: { customerId: string; userId: string; origin: string }) {
  const messages = cardUpdateMessages();
  const create = (branded: boolean) =>
    stripe.checkout.sessions.create({
      mode: "setup",
      customer: input.customerId,
      payment_method_types: ["card"],
      ...(branded ? { branding_settings: CHECKOUT_BRANDING, ...CHECKOUT_PRESENTATION } : {}),
      custom_text: {
        submit: { message: messages.submit },
        ...(branded ? { after_submit: { message: messages.afterSubmit } } : {}),
      },
      success_url: `${input.origin}/billing?card=updated&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/billing?card=cancelled`,
      setup_intent_data: { metadata: { app: "storyloop", user_id: input.userId, purpose: "card_update" } },
      metadata: { app: "storyloop", user_id: input.userId, purpose: "card_update" },
    });
  try {
    return await create(true);
  } catch (error) {
    if (!isBrandingRefusal(error)) throw error;
    console.error("Card page presentation refused, continuing without it:", error);
    return create(false);
  }
}

export type CardResult =
  | { ok: true; paidOverdue: number; overdueFailed: number; currency: string | null }
  | { ok: false; reason: "not_a_card_update" | "not_yours" | "not_complete" | "no_card" };

const alreadyPaid = (error: unknown) => /already paid/i.test((error as { message?: string })?.message ?? "") || (error as { code?: string })?.code === "invoice_already_paid";

/**
 * Make the card saved on a completed card page the one StoryLoop charges: the
 * customer's default, every live subscription's default, and any overdue
 * invoice paid with it now. Safe to run twice (the success page and the
 * webhook both call it).
 */
export async function applySavedCard(stripe: Stripe, input: { sessionId: string; customerId: string }): Promise<CardResult> {
  const session = await stripe.checkout.sessions.retrieve(input.sessionId, { expand: ["setup_intent"] });
  if (session.mode !== "setup" || session.metadata?.app !== "storyloop") return { ok: false, reason: "not_a_card_update" };
  if (idOf(session.customer as string | { id?: string } | null) !== input.customerId) return { ok: false, reason: "not_yours" };
  if (session.status !== "complete") return { ok: false, reason: "not_complete" };
  const intent = typeof session.setup_intent === "string" ? await stripe.setupIntents.retrieve(session.setup_intent) : session.setup_intent;
  const paymentMethod = idOf(intent?.payment_method as string | { id?: string } | null);
  if (!paymentMethod) return { ok: false, reason: "no_card" };

  await stripe.customers.update(input.customerId, { invoice_settings: { default_payment_method: paymentMethod } });
  const subs = await stripe.subscriptions.list({ customer: input.customerId, status: "all", limit: 20 });
  let paidOverdue = 0;
  let overdueFailed = 0;
  let currency: string | null = null;
  for (const sub of subs.data) {
    if (!MANAGEABLE.has(sub.status)) continue;
    if (idOf(sub.default_payment_method as string | { id?: string } | null) !== paymentMethod) {
      await stripe.subscriptions.update(sub.id, { default_payment_method: paymentMethod });
    }
    if (!OVERDUE.has(sub.status)) continue;
    const open = await stripe.invoices.list({ subscription: sub.id, status: "open", limit: 10 });
    for (const invoice of open.data) {
      if (!invoice.id) continue;
      try {
        await stripe.invoices.pay(invoice.id, { payment_method: paymentMethod });
        paidOverdue += invoice.amount_due;
        currency = invoice.currency;
      } catch (error) {
        if (!alreadyPaid(error)) overdueFailed += 1;
      }
    }
  }
  return { ok: true, paidOverdue, overdueFailed, currency };
}

/** Cancel at the end of the paid (or free) period, or keep the plan after all. */
export async function setCancellation(
  stripe: Stripe,
  input: { customerId: string; subscriptionId?: string | null; cancel: boolean; reason?: CancellationReason | null; comment?: string | null },
) {
  const sub = await findManageableSubscription(stripe, input.customerId, input.subscriptionId);
  if (!sub) return { ok: false as const, reason: "no_subscription" as const };
  const updated = input.cancel
    ? await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true,
        cancellation_details: {
          ...(input.reason ? { feedback: input.reason } : {}),
          ...(input.comment ? { comment: input.comment.slice(0, 500) } : {}),
        },
      })
    : await keepSubscription(stripe, sub);
  return { ok: true as const, subscription: subscriptionView(updated, null) };
}

/**
 * Undo a cancellation. Stripe sets cancel_at alongside cancel_at_period_end and
 * refuses both in one request, so clear the flag, then any end date left over
 * (a dated cancellation has only the date).
 */
async function keepSubscription(stripe: Stripe, sub: Stripe.Subscription) {
  let updated = sub;
  if (sub.cancel_at_period_end) updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
  if (updated.cancel_at) updated = await stripe.subscriptions.update(sub.id, { cancel_at: "" });
  return updated;
}
