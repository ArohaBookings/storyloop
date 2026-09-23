import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPlanByKey, normalizePlanKey } from "@/lib/plans";
import { sendLifecycleEmail } from "./send";
import type { LifecycleEmailType } from "./templates";

/**
 * Billing emails, triggered from the Stripe webhook.
 *
 * The templates for these already existed and nothing ever called them, so a
 * paying educator could have a card expire, silently drop to past_due, and
 * lapse without ever being told. Failed cards are involuntary churn: the
 * customer did not decide to leave, their bank did, and one email recovers a
 * large share of them.
 *
 * Two things make this safe to run against live subscriptions:
 *
 * 1. IDEMPOTENCY. `sendLifecycleEmail` dedupes on (user, type, story), which is
 *    right for once-ever emails and WRONG here: it would send the first receipt
 *    and silently swallow every month after. So these pass `force: true` and
 *    carry their own key instead -- the Stripe invoice or subscription id --
 *    checked against what we have already sent. The webhook also dedupes at the
 *    event level, but it degrades to processing without idempotency if its
 *    table is missing, so this is the second lock rather than the only one.
 *
 * 2. NOTHING THROWS. A failed email must never fail the webhook: Stripe would
 *    retry, and the subscription state update matters far more than the mail.
 *    Every path here returns a reason instead of raising.
 */

type BillingEmailType = Extract<
  LifecycleEmailType,
  "payment_succeeded" | "payment_failed" | "payment_failed_final" | "cancellation_scheduled" | "subscription_cancelled"
>;

type Recipient = { userId: string; email: string; name: string | null; plan: string | null };

/** Money as an educator would read it: "NZ$21.00", not "2100 nzd". */
export function formatAmount(amountInCents: number | null | undefined, currency: string | null | undefined) {
  if (typeof amountInCents !== "number" || !Number.isFinite(amountInCents)) return null;
  const code = (currency ?? "nzd").toUpperCase();
  const major = amountInCents / 100;
  const prefix = code === "NZD" ? "NZ$" : code === "AUD" ? "A$" : code === "USD" ? "US$" : `${code} `;
  return `${prefix}${major.toFixed(2)}`;
}

/** A date an educator would read: "14 October 2026". */
export function formatDate(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  try {
    return new Date(seconds * 1000).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

async function resolveRecipient(
  admin: ReturnType<typeof createAdminSupabase>,
  opts: { userId?: string | null; customerId?: string | null },
): Promise<Recipient | null> {
  const select = "id, email, full_name, plan";
  try {
    if (opts.userId) {
      const { data } = await admin.from("profiles").select(select).eq("id", opts.userId).maybeSingle();
      if (data?.email) return { userId: data.id, email: data.email, name: data.full_name ?? null, plan: data.plan ?? null };
    }
    if (opts.customerId) {
      const { data } = await admin
        .from("profiles")
        .select(select)
        .eq("stripe_customer_id", opts.customerId)
        .maybeSingle();
      if (data?.email) return { userId: data.id, email: data.email, name: data.full_name ?? null, plan: data.plan ?? null };
    }
  } catch (error) {
    console.error("Billing email: could not resolve recipient:", error);
  }
  return null;
}

/**
 * Have we already sent this exact billing email for this exact invoice or
 * subscription? Fails OPEN: if the lookup itself errors we send, because a
 * missed payment-failure notice costs a customer and a duplicate only annoys.
 */
async function alreadySent(
  admin: ReturnType<typeof createAdminSupabase>,
  type: BillingEmailType,
  userId: string,
  billingKey: string,
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("email_events")
      .select("id")
      .eq("user_id", userId)
      .eq("email_type", type)
      .eq("metadata->>billing_key", billingKey)
      .in("delivery_status", ["sent", "skipped_unconfigured"])
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("Billing email: idempotency check failed, sending anyway:", error.message);
      return false;
    }
    return Boolean(data);
  } catch (error) {
    console.warn("Billing email: idempotency check threw, sending anyway:", error);
    return false;
  }
}

/**
 * Which notice a failed payment gets, and under which idempotency key.
 *
 * Stripe fires invoice.payment_failed on every attempt. While retries remain,
 * the first failure gets "payment_failed" keyed on the invoice, and later
 * attempts on the same invoice dedupe against it. When Stripe has no retry left,
 * new stories actually stop, so that moment gets "payment_failed_final" under a
 * DIFFERENT key; reusing the invoice key would swallow it as a duplicate of the
 * first notice. At most two emails per invoice, never one per attempt.
 */
export function paymentFailureNotice(
  invoiceKey: string,
  nextAttemptAt: string | number | null | undefined,
): { type: "payment_failed" | "payment_failed_final"; billingKey: string } {
  const hasRetryLeft = nextAttemptAt !== null && nextAttemptAt !== undefined && nextAttemptAt !== "";
  return hasRetryLeft
    ? { type: "payment_failed", billingKey: invoiceKey }
    : { type: "payment_failed_final", billingKey: `${invoiceKey}:final` };
}

type CancellationFields = {
  id: string;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  cancel_at?: number | null;
};

function isScheduledToCancel(fields: { cancel_at_period_end?: unknown; cancel_at?: unknown }) {
  return fields.cancel_at_period_end === true || typeof fields.cancel_at === "number";
}

/**
 * Did this subscription update just schedule a cancellation?
 *
 * The billing portal cancels at the end of the period, which arrives as
 * customer.subscription.updated. Depending on API version Stripe marks it with
 * cancel_at_period_end, cancel_at, or both, so either counts. The previous
 * attributes decide whether it is NEW: an update that only moves the renewal
 * date, or touches an already-scheduled cancellation, sends nothing.
 *
 * Keyed on the subscription and the end date, so cancelling, undoing and
 * cancelling again in the same period sends one email, not three.
 */
export function newlyScheduledCancellation(
  current: CancellationFields,
  previous: Record<string, unknown> | null | undefined,
  periodEndSeconds: number | null | undefined,
): { billingKey: string; endsAtSeconds: number | null } | null {
  if (!previous || typeof previous !== "object") return null;
  if (current.status === "canceled" || current.status === "incomplete_expired") return null;
  if (!isScheduledToCancel(current)) return null;

  const touched = "cancel_at_period_end" in previous || "cancel_at" in previous;
  if (!touched) return null;
  const before = {
    cancel_at_period_end: "cancel_at_period_end" in previous ? previous.cancel_at_period_end : current.cancel_at_period_end,
    cancel_at: "cancel_at" in previous ? previous.cancel_at : current.cancel_at,
  };
  if (isScheduledToCancel(before)) return null;

  const endsAtSeconds =
    typeof current.cancel_at === "number"
      ? current.cancel_at
      : typeof periodEndSeconds === "number" && Number.isFinite(periodEndSeconds)
        ? periodEndSeconds
        : null;
  return { billingKey: `${current.id}:cancel_scheduled:${endsAtSeconds ?? "unknown"}`, endsAtSeconds };
}

export type BillingEmailResult =
  | { status: "sent" | "skipped_duplicate" | "skipped_no_recipient" | "skipped_zero_amount" | "failed" }
  | { status: "skipped_other"; reason: string };

export async function sendBillingEmail(params: {
  admin: ReturnType<typeof createAdminSupabase>;
  type: BillingEmailType;
  /** Stripe invoice or subscription id. One email per key, ever. */
  billingKey: string;
  userId?: string | null;
  customerId?: string | null;
  amountInCents?: number | null;
  currency?: string | null;
  /** Unix seconds for the next renewal, where Stripe gave us one. */
  renewsAtSeconds?: number | null;
  /** Unix seconds when a scheduled cancellation takes effect. */
  endsAtSeconds?: number | null;
  /** Extra facts to keep on the email event, such as why they cancelled. */
  extraMetadata?: Record<string, string>;
  /** The subscription ended because a no-card free month ran out. */
  trialLapsed?: boolean;
}): Promise<BillingEmailResult> {
  try {
    const recipient = await resolveRecipient(params.admin, {
      userId: params.userId,
      customerId: params.customerId,
    });
    if (!recipient) return { status: "skipped_no_recipient" };

    // A zero-dollar invoice is a trial starting or a full credit, not a
    // payment. Thanking someone for paying nothing reads as a mistake.
    if (params.type === "payment_succeeded" && (params.amountInCents ?? 0) <= 0) {
      return { status: "skipped_zero_amount" };
    }

    if (await alreadySent(params.admin, params.type, recipient.userId, params.billingKey)) {
      return { status: "skipped_duplicate" };
    }

    const planKey = normalizePlanKey(recipient.plan);
    const result = await sendLifecycleEmail({
      type: params.type,
      userId: recipient.userId,
      recipient: recipient.email,
      name: recipient.name,
      // The type-level dedupe below us is wrong for recurring billing; our own
      // per-invoice key above is the guard that matters.
      force: true,
      metadata: { ...params.extraMetadata, billing_key: params.billingKey, source: "stripe_webhook" },
      context: {
        amountLabel: formatAmount(params.amountInCents, params.currency) ?? undefined,
        planLabel: planKey === "free" ? undefined : getPlanByKey(planKey).name,
        renewsOn: formatDate(params.renewsAtSeconds) ?? undefined,
        endsOn: formatDate(params.endsAtSeconds) ?? undefined,
        trialLapsed: params.trialLapsed || undefined,
      },
    });

    return result.status === "sent" ? { status: "sent" } : { status: "skipped_other", reason: result.status };
  } catch (error) {
    // Never let mail failure fail the webhook. Stripe would retry the whole
    // event, and the subscription state update matters more than the email.
    console.error("Billing email failed:", error);
    return { status: "failed" };
  }
}
