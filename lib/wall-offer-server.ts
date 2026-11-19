import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { educatorCheckoutDiscount, type EducatorDiscount } from "@/lib/wall-offer";

/**
 * Which discount Educator checkout will apply for this account when a wall or
 * the "1 free story left" prompt opens it (activationOffer: true, no special
 * offer): read the same way app/api/stripe/checkout/route.ts reads it (the
 * referral row with the admin client, her Stripe subscription history only
 * when she was referred and has a customer), then decided by the shared pure
 * rule in lib/wall-offer.ts. Unknown history counts as not her first
 * subscription, as checkout does. Read only: nothing is written.
 */
export async function readEducatorDiscount({
  admin,
  stripe,
  userId,
  plan,
  stripeCustomerId,
}: {
  admin: SupabaseClient;
  stripe: Stripe;
  userId: string;
  plan: string | null | undefined;
  stripeCustomerId: string | null | undefined;
}): Promise<EducatorDiscount> {
  const { data: referralRow } = await admin.from("referrals").select("id").eq("referred_user_id", userId).maybeSingle();
  let firstSubscription = true;
  if (referralRow && stripeCustomerId) {
    try {
      const previous = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 1 });
      firstSubscription = previous.data.length === 0;
    } catch {
      firstSubscription = false;
    }
  }
  return educatorCheckoutDiscount({
    specialOffer: false,
    centrePlan: false,
    referred: Boolean(referralRow),
    firstSubscription,
    activationAsked: true,
    accountPlan: plan,
  });
}
