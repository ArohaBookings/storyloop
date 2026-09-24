import type { CurrencyCode, PlanKey } from "@/lib/plans";

/**
 * A fixed Stripe price for a plan, when one is configured. When none is,
 * checkout and plan changes build the price inline from PLAN_DEFINITIONS, which
 * is how every StoryLoop subscription has been created so far.
 */
export function configuredPriceId(plan: PlanKey, currency: CurrencyCode) {
  if (currency === "NZD") {
    if (plan === "educator") return process.env.STRIPE_PRICE_EDUCATOR_NZD;
    if (plan === "educator_pro") return process.env.STRIPE_PRICE_EDUCATOR_PRO_NZD;
    if (plan === "centre_starter") return process.env.STRIPE_PRICE_CENTRE_STARTER_NZD ?? process.env.STRIPE_PRICE_CENTRE_NZD;
    if (plan === "centre_growth") return process.env.STRIPE_PRICE_CENTRE_GROWTH_NZD;
  } else {
    if (plan === "educator") return process.env.STRIPE_PRICE_EDUCATOR_AUD;
    if (plan === "educator_pro") return process.env.STRIPE_PRICE_EDUCATOR_PRO_AUD;
    if (plan === "centre_starter") return process.env.STRIPE_PRICE_CENTRE_STARTER_AUD ?? process.env.STRIPE_PRICE_CENTRE_AUD;
    if (plan === "centre_growth") return process.env.STRIPE_PRICE_CENTRE_GROWTH_AUD;
  }
  return null;
}

/**
 * The live StoryLoop prices, as they exist in the Stripe account (checked
 * 2026-09-23). Used only when the environment does not name a price, and only
 * after the same amount check as any other candidate.
 */
const KNOWN_LIVE_PRICES: Partial<Record<PlanKey, Record<CurrencyCode, string>>> = {
  educator: { NZD: "price_1TOVoR1eBrPYVPx1aFF8yBKX", AUD: "price_1TOVnZ1eBrPYVPx1zY3G1coE" },
  // Own product "StoryLoop Educator Pro" since 24 Sept 2026 (the old prices sat on the
  // "StoryLoop Educator" product, so checkout called Pro "Educator"). No subscriber was on the old ones.
  educator_pro: { NZD: "price_1UJ3mM1eBrPYVPx1xgCamsYu", AUD: "price_1UJ3mN1eBrPYVPx1lLG8uXbI" },
  centre_starter: { NZD: "price_1Txxpo1eBrPYVPx1JuyK3z6v", AUD: "price_1Txxpp1eBrPYVPx1A6mKniLI" },
  centre_growth: { NZD: "price_1Txxpp1eBrPYVPx1phvqIh7w", AUD: "price_1Txxpq1eBrPYVPx1LQIEtl5G" },
};

type PriceLike = { active?: boolean; currency?: string; unit_amount?: number | null; recurring?: { interval?: string; interval_count?: number } | null };

/** Whether a Stripe price is exactly this plan's monthly price. Pure. */
export function priceMatchesPlan(price: PriceLike | null | undefined, expectedCents: number, currency: CurrencyCode) {
  return Boolean(
    price &&
      price.active !== false &&
      price.currency?.toUpperCase() === currency &&
      price.unit_amount === expectedCents &&
      price.recurring?.interval === "month" &&
      (price.recurring.interval_count ?? 1) === 1,
  );
}

const verified = new Map<string, { at: number; id: string | null }>();

/**
 * A price id that is VERIFIED to charge exactly the plan's advertised amount,
 * or null (the caller then builds the price inline from PLAN_DEFINITIONS).
 *
 * Why: the environment still carries STRIPE_PRICE_CENTRE_NZD/AUD from the old
 * one-centre-plan era, and the account still has the old NZ$55 / A$49 centre
 * prices. Trusting a configured id blindly could bill a centre half of what the
 * pricing page says. Every candidate is fetched and its amount, currency and
 * interval checked before it is used.
 */
export async function resolveVerifiedPriceId(
  stripe: { prices: { retrieve: (id: string) => Promise<PriceLike> } },
  plan: PlanKey,
  currency: CurrencyCode,
  expectedCents: number,
  options: { live?: boolean } = {},
): Promise<string | null> {
  const key = `${plan}:${currency}:${expectedCents}`;
  const hit = verified.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.id;

  const candidates = [configuredPriceId(plan, currency), options.live ? KNOWN_LIVE_PRICES[plan]?.[currency] : undefined]
    .filter((id): id is string => Boolean(id));
  let chosen: string | null = null;
  for (const id of [...new Set(candidates)]) {
    try {
      const price = await stripe.prices.retrieve(id);
      if (priceMatchesPlan(price, expectedCents, currency)) {
        chosen = id;
        break;
      }
      console.error(`Stripe price ${id} does not match ${plan} ${currency} ${expectedCents}; not using it.`);
    } catch {
      /* try the next candidate */
    }
  }
  verified.set(key, { at: Date.now(), id: chosen });
  return chosen;
}

export function resetVerifiedPriceCache() {
  verified.clear();
}
