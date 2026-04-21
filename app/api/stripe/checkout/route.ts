import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

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

    const { plan, currency = "AUD" } = await request.json();
    const priceId = getPriceId(plan, currency);
    if (!priceId) return NextResponse.json({ error: "Invalid plan or price not configured" }, { status: 400 });

    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, full_name").eq("id", user.id).single();

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
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, plan },
      },
      metadata: { user_id: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
