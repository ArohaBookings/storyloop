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
