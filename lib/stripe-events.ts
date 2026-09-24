/**
 * What a Stripe event is about, in plain English, and whose it is.
 *
 * The Stripe account is shared with Leo's other businesses, and Stripe sends
 * every event of a subscribed type to every endpoint, so StoryLoop's webhook
 * also hears other businesses' checkouts and invoices. The webhook uses these
 * facts to find the StoryLoop account an event belongs to, and drops the event
 * untouched and unrecorded when there is none. Pure, so it is tested
 * (tests/stripe-events.test.ts).
 */

type AnyObject = Record<string, unknown>;

export type StripeEventLike = { id: string; type: string; created?: number; data: { object: unknown; previous_attributes?: AnyObject } };

export type StripeEventFacts = {
  /** metadata.user_id wherever Stripe carries it, if it is a UUID. */
  userId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  amount: number | null;
  currency: string | null;
  plan: string | null;
  summary: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLAN_NAMES: Record<string, string> = {
  educator: "Educator",
  educator_pro: "Educator Pro",
  centre_starter: "Centre Starter",
  centre_growth: "Centre Growth",
  free: "Free",
};

function obj(value: unknown): AnyObject {
  return value && typeof value === "object" ? (value as AnyObject) : {};
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  const id = obj(value).id;
  return typeof id === "string" ? id : null;
}

function numberOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metadataSources(object: AnyObject): AnyObject[] {
  const parent = obj(object.parent);
  return [
    obj(object.metadata),
    obj(obj(parent.subscription_details).metadata),
    obj(obj(object.subscription_details).metadata),
    obj(obj(object.subscription_data).metadata),
  ];
}

function fromMetadata(object: AnyObject, key: string): string | null {
  for (const source of metadataSources(object)) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function formatMoney(amountCents: number | null, currency: string | null) {
  if (amountCents == null) return "";
  const code = (currency ?? "nzd").toUpperCase();
  const symbol = code === "NZD" ? "NZ$" : code === "AUD" ? "A$" : `${code} `;
  return `${symbol}${(amountCents / 100).toFixed(2)}`;
}

function day(seconds: unknown) {
  const value = numberOf(seconds);
  if (value == null) return null;
  const date = new Date(value * 1000);
  const weekday = date.toLocaleDateString("en-NZ", { weekday: "short", timeZone: "Pacific/Auckland" });
  const dayMonth = date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" });
  return `${weekday} ${dayMonth}`;
}

function planName(plan: string | null) {
  return plan ? PLAN_NAMES[plan] ?? plan : "a plan";
}

function subscriptionPlan(object: AnyObject): string | null {
  return fromMetadata(object, "plan");
}

function describe(event: StripeEventLike, object: AnyObject, facts: Omit<StripeEventFacts, "summary">): string {
  const money = formatMoney(facts.amount, facts.currency);
  const plan = planName(facts.plan);
  const previous = obj(event.data.previous_attributes);
  switch (event.type) {
    case "checkout.session.completed": {
      const trialEnd = day(obj(object.subscription_details).trial_end) ?? null;
      return `Finished checkout for ${plan}${facts.amount ? `, paid ${money}` : trialEnd ? `, trial until ${trialEnd}` : ""}`;
    }
    case "checkout.session.expired":
      return `Opened checkout for ${plan} but did not finish`;
    case "customer.subscription.created": {
      const status = String(object.status ?? "");
      const trialEnd = day(object.trial_end);
      return status === "trialing" ? `Started a ${plan} trial${trialEnd ? `, ends ${trialEnd}` : ""}` : `Subscribed to ${plan} (${status || "new"})`;
    }
    case "customer.subscription.updated": {
      if (previous.cancel_at_period_end === false && object.cancel_at_period_end === true) {
        const items = (obj(object.items).data as unknown[] | undefined) ?? [];
        const ends = day(object.cancel_at) ?? day(obj(items[0]).current_period_end);
        return `Cancelled ${plan}${ends ? `, keeps access until ${ends}` : ""}`;
      }
      if (previous.cancel_at_period_end === true && object.cancel_at_period_end === false) return `Changed their mind and kept ${plan}`;
      if (typeof previous.status === "string" && previous.status !== object.status) {
        if (previous.status === "trialing" && object.status === "active") return `Trial turned into a paid ${plan} plan`;
        return `${plan}: ${previous.status.replace(/_/g, " ")} → ${String(object.status).replace(/_/g, " ")}`;
      }
      const previousPlan = typeof obj(previous.metadata).plan === "string" ? String(obj(previous.metadata).plan) : null;
      if (previousPlan && previousPlan !== facts.plan) return `Changed plan from ${planName(previousPlan)} to ${plan}`;
      if (previous.default_payment_method !== undefined) return `Updated the card on ${plan}`;
      return `${plan} subscription updated`;
    }
    case "customer.subscription.deleted":
      return `${plan} subscription ended`;
    case "customer.subscription.paused":
      return `${plan} paused`;
    case "customer.subscription.resumed":
      return `${plan} resumed`;
    case "customer.subscription.trial_will_end":
      return `${plan} trial ends ${day(object.trial_end) ?? "in 3 days"}${object.default_payment_method ? "" : ", no card on file yet"}`;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return facts.amount ? `Paid ${money}` : "Invoice for nothing (trial or discount)";
    case "invoice.payment_failed": {
      const attempt = numberOf(object.attempt_count);
      const next = day(object.next_payment_attempt);
      return `Card payment of ${money} failed${attempt ? ` (attempt ${attempt})` : ""}${next ? `, Stripe retries ${next}` : ", no retries left"}`;
    }
    case "invoice.payment_action_required":
      return `Payment of ${money} needs them to confirm with their bank`;
    case "invoice.upcoming":
      return `Will be charged ${money}${day(object.next_payment_attempt) ? ` on ${day(object.next_payment_attempt)}` : " soon"}`;
    case "charge.refunded":
      return `Refunded ${formatMoney(numberOf(object.amount_refunded), facts.currency)}`;
    case "charge.dispute.created":
      return `Opened a dispute for ${money}. Respond in Stripe before the deadline`;
    case "charge.dispute.closed":
      return `Dispute for ${money} closed: ${String(object.status ?? "").replace(/_/g, " ")}`;
    case "customer.updated":
      return "Updated their billing details";
    default:
      return event.type.replace(/[._]/g, " ");
  }
}

export function stripeEventFacts(event: StripeEventLike): StripeEventFacts {
  const object = obj(event.data.object);
  const rawUser = fromMetadata(object, "user_id");
  const objectType = String(object.object ?? "");
  const customerId = objectType === "customer" ? idOf(object.id) : idOf(object.customer);
  const subscriptionId = objectType === "subscription"
    ? idOf(object.id)
    : idOf(object.subscription) ?? idOf(obj(obj(object.parent).subscription_details).subscription);

  let amount: number | null = null;
  if (objectType === "invoice") amount = numberOf(event.type === "invoice.paid" || event.type === "invoice.payment_succeeded" ? object.amount_paid : object.amount_due);
  else if (objectType === "checkout.session") amount = numberOf(object.amount_total);
  else if (objectType === "charge" || objectType === "dispute") amount = numberOf(object.amount);
  else if (objectType === "subscription") {
    const firstItem = obj((obj(object.items).data as unknown[] | undefined)?.[0]);
    const price = obj(firstItem.price);
    amount = numberOf(price.unit_amount);
  }
  const currency = typeof object.currency === "string" ? object.currency : null;

  const base = {
    userId: rawUser && UUID.test(rawUser) ? rawUser.toLowerCase() : null,
    customerId,
    subscriptionId,
    amount,
    currency,
    plan: subscriptionPlan(object),
  };
  return { ...base, summary: describe(event, object, base).slice(0, 240) };
}
