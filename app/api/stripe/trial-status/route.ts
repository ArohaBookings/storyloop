import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { createStripe } from "@/lib/stripe-client";
import { foundingCouponId, isCentrePlan } from "@/lib/centre-offer";

export const dynamic = "force-dynamic";

/**
 * For Billing: is this a centre's free month, is a card on file yet, and is it
 * a founding centre? Answered from Stripe, which is the only source that knows
 * whether a card has been added in the portal.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  const base = { centreTrial: false, cardOnFile: null as boolean | null, founding: false, trialEndsAt: null as string | null };
  if (profile.subscription_status !== "trialing" || !isCentrePlan(profile.plan) || !profile.stripe_customer_id) {
    return NextResponse.json(base);
  }

  try {
    const stripe = createStripe();
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "trialing",
      limit: 5,
      expand: ["data.discounts"],
    });
    const sub = subs.data.find((row) => isCentrePlan(row.metadata?.plan)) ?? subs.data[0];
    if (!sub) return NextResponse.json(base);
    let cardOnFile = Boolean(sub.default_payment_method);
    if (!cardOnFile) {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      cardOnFile =
        !("deleted" in customer && customer.deleted) &&
        Boolean((customer as { invoice_settings?: { default_payment_method?: unknown } }).invoice_settings?.default_payment_method);
    }
    const coupon = foundingCouponId();
    const founding =
      sub.metadata?.founding_centre === "true" ||
      (sub.discounts ?? []).some((discount) => {
        if (typeof discount === "string") return false;
        const source = (discount as { source?: { coupon?: string | { id?: string } } }).source;
        const id = typeof source?.coupon === "string" ? source.coupon : source?.coupon?.id;
        return id === coupon;
      });
    return NextResponse.json({
      centreTrial: true,
      cardOnFile,
      founding,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    });
  } catch {
    return NextResponse.json({ ...base, centreTrial: true });
  }
}
