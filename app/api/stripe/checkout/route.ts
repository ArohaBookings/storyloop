import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
}

function normaliseCurrency(value: unknown) {
  return value === "NZD" ? "NZD" : "AUD";
}

function getPriceId(plan: string, currency: string) {
  if (currency === "NZD") {
    if (plan === "educator") return process.env.STRIPE_PRICE_EDUCATOR_NZD;
    if (plan === "centre") return process.env.STRIPE_PRICE_CENTRE_NZD;
  } else {
    if (plan === "educator") return process.env.STRIPE_PRICE_EDUCATOR_AUD;
    if (plan === "centre") return process.env.STRIPE_PRICE_CENTRE_AUD;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    const { plan, currency } = await request.json();
    const selectedCurrency = normaliseCurrency(currency);
    const priceId = getPriceId(plan, selectedCurrency);
    if (!priceId) return NextResponse.json({ error: "Invalid plan or price not configured" }, { status: 400 });

    const profile = await getOrCreateProfile(user);

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      client_reference_id: user.id,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/billing`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, plan, currency: selectedCurrency },
      },
      metadata: { user_id: user.id, plan, currency: selectedCurrency },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
