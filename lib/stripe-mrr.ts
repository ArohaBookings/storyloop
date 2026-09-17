import { createStripe } from "@/lib/stripe-client";
import { unstable_cache } from "next/cache";
import { DEFAULT_AUD_TO_NZD, toSubscriptionLike, type SubscriptionLike } from "@/lib/mrr";

/**
 * Loads subscriptions from Stripe for the admin revenue panel. Read-only.
 *
 * Cached for ten minutes so opening the dashboard repeatedly does not hammer
 * the Stripe API, and never throws: if Stripe is unreachable the dashboard
 * falls back to its list-price estimate and says so.
 */

const MAX_PER_STATUS = 2000;
const STATUSES = ["active", "past_due", "trialing", "canceled"] as const;

async function fetchSubscriptions(): Promise<{ subscriptions: SubscriptionLike[]; error: string | null; fetchedAt: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { subscriptions: [], error: "STRIPE_SECRET_KEY is not configured", fetchedAt: new Date().toISOString() };

  try {
    const stripe = createStripe(key);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const subscriptions: SubscriptionLike[] = [];
    for (const status of STATUSES) {
      let count = 0;
      for await (const subscription of stripe.subscriptions.list({
        status,
        limit: 100,
        expand: ["data.discounts", "data.discounts.source.coupon"],
      })) {
        subscriptions.push(toSubscriptionLike(subscription, nowSeconds));
        count += 1;
        if (count >= MAX_PER_STATUS) break;
      }
    }
    return { subscriptions, error: null, fetchedAt: new Date().toISOString() };
  } catch (error) {
    console.error("Stripe MRR load failed:", error);
    return {
      subscriptions: [],
      error: error instanceof Error ? error.message : "Stripe could not be reached",
      fetchedAt: new Date().toISOString(),
    };
  }
}

export const loadStripeSubscriptions = unstable_cache(fetchSubscriptions, ["admin-stripe-subscriptions"], { revalidate: 600 });

export function audToNzdRate() {
  const parsed = Number.parseFloat(process.env.AUD_TO_NZD_RATE ?? "");
  return Number.isFinite(parsed) && parsed > 0.5 && parsed < 2 ? parsed : DEFAULT_AUD_TO_NZD;
}
