import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Her Stripe customer: the one on her profile, or a new one saved to it.
 * Moved unchanged out of app/api/stripe/checkout/route.ts (25 Nov 2026) so the
 * centre start with no payment page (app/api/centres/start-free) makes the
 * customer exactly as checkout does.
 */
export async function ensureCustomer({
  stripe,
  supabase,
  user,
  profile,
}: {
  stripe: Stripe;
  /** The signed-in user's own client: the profile row is hers. */
  supabase: SupabaseClient;
  user: { id: string; email?: string | null };
  profile: { stripe_customer_id: string | null; full_name: string | null } | null;
}): Promise<string> {
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }
  return customerId;
}
