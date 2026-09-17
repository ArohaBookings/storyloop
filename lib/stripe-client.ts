import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-05-27.dahlia";

/**
 * The one place StoryLoop creates a Stripe client.
 *
 * STRIPE_API_BASE_FOR_TESTS points the client at a local mock server so billing
 * flows can be exercised end to end without touching the real Stripe account.
 * It is ignored on every Vercel deployment (production and preview), so it can
 * never redirect real payments, whatever the environment variables say.
 */
export function stripeTestServer(env: Record<string, string | undefined> = process.env) {
  const raw = env.STRIPE_API_BASE_FOR_TESTS;
  if (!raw) return null;
  // Never on Vercel, whatever else is set.
  if (env.VERCEL || env.VERCEL_ENV) return null;
  // A local production build (next start) must opt in explicitly.
  if (env.NODE_ENV === "production" && env.ALLOW_STRIPE_TEST_SERVER !== "1") return null;
  try {
    const url = new URL(raw);
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return null;
    return {
      host: url.hostname,
      port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
      protocol: url.protocol === "https:" ? ("https" as const) : ("http" as const),
    };
  } catch {
    return null;
  }
}

export function createStripe(key: string | undefined = process.env.STRIPE_SECRET_KEY) {
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const testServer = stripeTestServer();
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION, ...(testServer ?? {}) });
}
