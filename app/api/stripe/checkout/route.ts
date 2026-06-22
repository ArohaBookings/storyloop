import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getPlanByKey, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
}

function normaliseCurrency(value: unknown): CurrencyCode {
  return value === "NZD" ? "NZD" : "AUD";
}

function getPriceId(plan: PlanKey, currency: CurrencyCode) {
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

function buildLineItem(plan: PlanKey, currency: CurrencyCode): Stripe.Checkout.SessionCreateParams.LineItem {
  const planDetails = getPlanByKey(plan);
  const priceId = getPriceId(plan, currency);
  if (priceId) return { price: priceId, quantity: 1 };

  return {
    quantity: 1,
    price_data: {
      currency: currency.toLowerCase(),
      unit_amount: planDetails.price[currency] * 100,
      recurring: { interval: "month" },
      product_data: {
        name: `StoryLoop ${planDetails.name}`,
        description: planDetails.description,
        metadata: { plan },
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    const { plan, currency, activationOffer } = await request.json();
    const selectedCurrency = normaliseCurrency(currency);
    const selectedPlan = normalizePlanKey(plan);
    if (selectedPlan === "free") {
      return NextResponse.json({ error: "Choose a paid plan before starting checkout" }, { status: 400 });
    }

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

    const activationCoupon =
      activationOffer === true && profile.plan === "free"
        ? await getRuntimeSecret("STRIPE_FIRST_MONTH_COUPON_ID", "stripe_first_month_coupon_id")
        : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      client_reference_id: user.id,
      payment_method_types: ["card"],
      line_items: [buildLineItem(selectedPlan, selectedCurrency)],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/billing`,
      allow_promotion_codes: !activationCoupon,
      discounts: activationCoupon ? [{ coupon: activationCoupon }] : undefined,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, plan: selectedPlan, currency: selectedCurrency, activation_offer: activationCoupon ? "true" : "false" },
      },
      metadata: { user_id: user.id, plan: selectedPlan, currency: selectedCurrency, activation_offer: activationCoupon ? "true" : "false" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
