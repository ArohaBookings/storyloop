import type Stripe from "stripe";
import { getPlanByKey, PLAN_ORDER, type PlanKey } from "@/lib/plans";

/**
 * Real MRR, from what Stripe actually bills.
 *
 * The dashboard's older figure multiplied plan counts by list prices (in AUD,
 * although the goal is NZ$10k) and counted free trials as revenue. This works
 * from the subscriptions themselves: the real unit amounts, quantities and
 * ongoing discounts, in each subscription's own currency, with trials kept
 * apart because a trial has not paid anything yet.
 *
 * The Stripe account is shared with other products, so a subscription only
 * counts when its metadata names a StoryLoop user that exists in StoryLoop.
 *
 * AUD is converted to NZD at a stated rate for the single headline figure.
 * Both currencies are always shown as billed, so the rate can never hide money.
 */

export const MRR_GOAL_NZD = 10_000;
export const DEFAULT_AUD_TO_NZD = 1.1;

export type SubscriptionLike = {
  id: string;
  status: string;
  currency: string;
  created: number;
  canceled_at?: number | null;
  ended_at?: number | null;
  metadata?: Record<string, string> | null;
  items: Array<{ unit_amount: number | null; quantity: number | null; interval: string | null; interval_count: number | null }>;
  /** What the customer told the Stripe portal when they cancelled. */
  cancellation?: { feedback: string | null; comment: string | null } | null;
  /** Discounts that keep applying (repeating or forever). One-off first-month discounts do not change MRR. */
  ongoingDiscounts?: Array<{ percent_off: number | null; amount_off: number | null; currency?: string | null }>;
};

export type Money = { NZD: number; AUD: number };

export type MrrSnapshot = {
  active: Money;
  trialing: Money;
  activeNzd: number;
  trialingNzd: number;
  activeCustomers: number;
  trialingCustomers: number;
  byPlan: Array<{ plan: PlanKey; customers: number; nzd: number }>;
  /** Subscriptions ignored because they are not StoryLoop's, or not NZD/AUD. */
  ignored: number;
};

const STORYLOOP_PLANS = new Set<string>(PLAN_ORDER.filter((plan) => plan !== "free"));

function isStoryLoop(subscription: SubscriptionLike, storyLoopUserIds: Set<string>) {
  const userId = subscription.metadata?.user_id;
  const plan = subscription.metadata?.plan;
  return Boolean(userId && plan && STORYLOOP_PLANS.has(plan) && storyLoopUserIds.has(userId));
}

/** Monthly amount in major units (dollars), after ongoing discounts. */
export function monthlyAmount(subscription: SubscriptionLike) {
  let cents = 0;
  for (const item of subscription.items) {
    const unit = item.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    const count = Math.max(1, item.interval_count ?? 1);
    const perMonth =
      item.interval === "year" ? unit / (12 * count)
        : item.interval === "week" ? (unit * 52) / (12 * count)
          : item.interval === "day" ? (unit * 365) / (12 * count)
            : unit / count;
    cents += perMonth * quantity;
  }
  for (const discount of subscription.ongoingDiscounts ?? []) {
    if (typeof discount.percent_off === "number") cents *= 1 - discount.percent_off / 100;
    else if (typeof discount.amount_off === "number") cents -= discount.amount_off;
  }
  return Math.max(0, Math.round(cents)) / 100;
}

function currencyKey(currency: string): keyof Money | null {
  const code = currency.toUpperCase();
  return code === "NZD" || code === "AUD" ? code : null;
}

const toNzd = (money: Money, audToNzd: number) => Math.round((money.NZD + money.AUD * audToNzd) * 100) / 100;

export function computeMrr(
  subscriptions: SubscriptionLike[],
  options: { storyLoopUserIds: Set<string>; audToNzd?: number },
): MrrSnapshot {
  const rate = options.audToNzd ?? DEFAULT_AUD_TO_NZD;
  const active: Money = { NZD: 0, AUD: 0 };
  const trialing: Money = { NZD: 0, AUD: 0 };
  let activeCustomers = 0;
  let trialingCustomers = 0;
  let ignored = 0;
  const plans = new Map<PlanKey, { customers: number; nzd: number }>();

  for (const subscription of subscriptions) {
    const currency = currencyKey(subscription.currency);
    if (!isStoryLoop(subscription, options.storyLoopUserIds) || !currency) {
      ignored += 1;
      continue;
    }
    const amount = monthlyAmount(subscription);
    if (subscription.status === "active" || subscription.status === "past_due") {
      // past_due is still billed revenue until Stripe gives up on it.
      active[currency] += amount;
      activeCustomers += 1;
      const plan = subscription.metadata!.plan as PlanKey;
      const entry = plans.get(plan) ?? { customers: 0, nzd: 0 };
      entry.customers += 1;
      entry.nzd += currency === "AUD" ? amount * rate : amount;
      plans.set(plan, entry);
    } else if (subscription.status === "trialing") {
      trialing[currency] += amount;
      trialingCustomers += 1;
    }
  }

  const round = (money: Money): Money => ({ NZD: Math.round(money.NZD * 100) / 100, AUD: Math.round(money.AUD * 100) / 100 });
  return {
    active: round(active),
    trialing: round(trialing),
    activeNzd: toNzd(active, rate),
    trialingNzd: toNzd(trialing, rate),
    activeCustomers,
    trialingCustomers,
    byPlan: PLAN_ORDER.filter((plan) => plans.has(plan)).map((plan) => ({
      plan,
      customers: plans.get(plan)!.customers,
      nzd: Math.round(plans.get(plan)!.nzd * 100) / 100,
    })),
    ignored,
  };
}

/** Distance to the goal, and what would close it, one plan at a time. */
export function goalProgress(activeNzd: number, goalNzd = MRR_GOAL_NZD) {
  const gap = Math.max(0, Math.round((goalNzd - activeNzd) * 100) / 100);
  return {
    goalNzd,
    percent: Math.min(100, Math.round((activeNzd / goalNzd) * 1000) / 10),
    gapNzd: gap,
    // How many more customers of ONE plan alone would close the gap, at NZD list price.
    customersNeeded: PLAN_ORDER.filter((plan) => plan !== "free").map((plan) => {
      const price = getPlanByKey(plan).price.NZD;
      return { plan, priceNzd: price, customers: price > 0 ? Math.ceil(gap / price) : 0 };
    }),
  };
}

/**
 * MRR won and lost over a window, for the "are we moving" line. A subscription
 * counts as won when it was created in the window and is paying now, and as
 * lost when it was cancelled in the window.
 */
export function mrrMovement(
  subscriptions: SubscriptionLike[],
  options: { storyLoopUserIds: Set<string>; sinceSeconds: number; audToNzd?: number },
) {
  const rate = options.audToNzd ?? DEFAULT_AUD_TO_NZD;
  let wonNzd = 0;
  let lostNzd = 0;
  let won = 0;
  let lost = 0;
  for (const subscription of subscriptions) {
    const currency = currencyKey(subscription.currency);
    if (!isStoryLoop(subscription, options.storyLoopUserIds) || !currency) continue;
    const nzd = monthlyAmount(subscription) * (currency === "AUD" ? rate : 1);
    if (subscription.created >= options.sinceSeconds && (subscription.status === "active" || subscription.status === "past_due")) {
      wonNzd += nzd;
      won += 1;
    }
    const endedAt = subscription.canceled_at ?? subscription.ended_at ?? null;
    if (subscription.status === "canceled" && typeof endedAt === "number" && endedAt >= options.sinceSeconds) {
      lostNzd += nzd;
      lost += 1;
    }
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { wonNzd: r(wonNzd), lostNzd: r(lostNzd), netNzd: r(wonNzd - lostNzd), won, lost };
}

/**
 * StoryLoop cancellations Stripe already knows about, shaped like cancellation
 * email events so lib/churn-reasons.ts counts each subscription once whichever
 * source it came from. Stripe has reasons from before the webhook kept them.
 */
export function stripeCancellationRows(
  subscriptions: SubscriptionLike[],
  options: { storyLoopUserIds: Set<string>; sinceSeconds: number },
) {
  return subscriptions
    .filter((subscription) => subscription.status === "canceled" && isStoryLoop(subscription, options.storyLoopUserIds))
    .filter((subscription) => typeof subscription.canceled_at === "number" && subscription.canceled_at >= options.sinceSeconds)
    .map((subscription) => ({
      email_type: "subscription_cancelled",
      sent_at: new Date((subscription.canceled_at as number) * 1000).toISOString(),
      metadata: {
        billing_key: subscription.id,
        cancel_feedback: subscription.cancellation?.feedback ?? undefined,
        cancel_comment: subscription.cancellation?.comment ?? undefined,
      },
    }));
}

/** A Stripe subscription (listed with discounts expanded) reduced to what MRR needs. */
export function toSubscriptionLike(subscription: Stripe.Subscription, nowSeconds: number): SubscriptionLike {
  const ongoingDiscounts: SubscriptionLike["ongoingDiscounts"] = [];
  for (const discount of subscription.discounts ?? []) {
    if (typeof discount === "string") continue;
    const coupon = discount.source?.coupon;
    if (!coupon || typeof coupon === "string") continue;
    // A one-off discount (like the first-month activation offer) is not recurring revenue lost.
    if (coupon.duration === "once") continue;
    if (typeof discount.end === "number" && discount.end <= nowSeconds) continue;
    ongoingDiscounts.push({ percent_off: coupon.percent_off, amount_off: coupon.amount_off, currency: coupon.currency });
  }

  return {
    id: subscription.id,
    status: subscription.status,
    currency: subscription.currency,
    created: subscription.created,
    canceled_at: subscription.canceled_at,
    ended_at: subscription.ended_at,
    metadata: subscription.metadata ?? null,
    cancellation: subscription.cancellation_details
      ? { feedback: subscription.cancellation_details.feedback ?? null, comment: subscription.cancellation_details.comment ?? null }
      : null,
    items: subscription.items.data.map((item) => ({
      unit_amount: item.price?.unit_amount ?? null,
      quantity: item.quantity ?? 1,
      interval: item.price?.recurring?.interval ?? null,
      interval_count: item.price?.recurring?.interval_count ?? null,
    })),
    ongoingDiscounts,
  };
}
