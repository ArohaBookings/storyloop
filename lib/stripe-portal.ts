import type Stripe from "stripe";
import { SITE_URL } from "@/lib/email/config";

/**
 * StoryLoop's own billing-portal settings.
 *
 * The account's default portal configuration is shared by every business on
 * it, so it is never edited. Instead StoryLoop keeps its own configuration,
 * found by `metadata.app = storyloop` and created the first time it is needed,
 * and passes it when it opens the portal. It matches the shared one feature for
 * feature (cancel at period end with a reason, card updates, invoices) and adds
 * what a StoryLoop customer should see: a StoryLoop headline, StoryLoop's
 * privacy policy and terms, and a way back to StoryLoop Billing.
 *
 * Any failure falls back to opening the portal exactly as before.
 */

let cached: { at: number; id: string | null } | null = null;
const CACHE_MS = 60 * 60_000;

export async function storyLoopPortalConfigurationId(stripe: Stripe): Promise<string | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.id;
  let id: string | null = null;
  try {
    const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
    id = existing.data.find((config) => config.metadata?.app === "storyloop")?.id ?? null;
    if (!id) {
      const created = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: "StoryLoop: your plan, card and invoices",
          privacy_policy_url: `${SITE_URL}/privacy`,
          terms_of_service_url: `${SITE_URL}/terms`,
        },
        default_return_url: `${SITE_URL}/billing`,
        features: {
          customer_update: { enabled: true, allowed_updates: ["email", "name"] },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
            proration_behavior: "none",
            cancellation_reason: {
              enabled: true,
              options: ["too_expensive", "missing_features", "switched_service", "unused", "too_complex", "low_quality", "other"],
            },
          },
        },
        metadata: { app: "storyloop" },
      });
      id = created.id;
    }
  } catch (error) {
    console.error("StoryLoop portal configuration unavailable, using the default:", error);
    id = null;
  }
  cached = { at: Date.now(), id };
  return id;
}

/** For tests. */
export function resetPortalConfigurationCache() {
  cached = null;
}
