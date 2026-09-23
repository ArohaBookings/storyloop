import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getPlanByKey, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { getOrCreateReferralCoupon } from "@/lib/referrals";
import { resolveActivationCoupon } from "@/lib/activation-offer";
import { resolveVerifiedPriceId } from "@/lib/stripe-prices";
import { checkoutTerms, foundingCouponId, foundingSpotsLeft, isCentrePlan, isCouponRefusal } from "@/lib/centre-offer";

function getStripe() {
  return createStripe();
}

function normaliseCurrency(value: unknown): CurrencyCode {
  return value === "NZD" ? "NZD" : "AUD";
}

async function buildLineItem(stripe: Stripe, plan: PlanKey, currency: CurrencyCode): Promise<Stripe.Checkout.SessionCreateParams.LineItem> {
  const planDetails = getPlanByKey(plan);
  // Only a price that is verified to charge exactly the advertised amount is
  // used. Otherwise the price is built inline from the plan definition.
  const priceId = await resolveVerifiedPriceId(stripe, plan, currency, planDetails.price[currency] * 100, {
    live: (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live"),
  });
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
        ? await resolveActivationCoupon(
            stripe.coupons,
            await getRuntimeSecret("STRIPE_FIRST_MONTH_COUPON_ID", "stripe_first_month_coupon_id"),
          )
        : undefined;

    // Someone who signed up through a referral link gets 10% off their first
    // month. The activation offer wins if both apply, because Stripe accepts
    // only one coupon per checkout and the activation offer is the stronger one.
    let referralCoupon: string | undefined;
    if (!activationCoupon) {
      const { data: referralRow } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_user_id", user.id)
        .maybeSingle();
      if (referralRow) {
        try {
          const coupon = await getOrCreateReferralCoupon(stripe);
          referralCoupon = coupon.id;
        } catch (error) {
          // A missing discount must never block someone from subscribing.
          console.error("Referral coupon unavailable:", error);
        }
      }
    }
    // Centres: a 30-day trial with no card needed, and a founding spot (50%
    // off after the free month) while any of the ten remain. A centre that has
    // had a centre subscription before is not a new centre. See
    // lib/centre-offer.ts for the reasoning behind each number.
    let hadCentreBefore = false;
    if (isCentrePlan(selectedPlan) && profile?.stripe_customer_id) {
      try {
        const previous = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
        hadCentreBefore = previous.data.some((sub) => isCentrePlan(sub.metadata?.plan));
      } catch {
        hadCentreBefore = false;
      }
    }
    const terms = checkoutTerms({
      plan: selectedPlan,
      spotsLeft: isCentrePlan(selectedPlan) ? await foundingSpotsLeft(stripe) : null,
      hadCentreBefore,
      couponId: foundingCouponId(),
    });
    const lineItem = await buildLineItem(stripe, selectedPlan, selectedCurrency);

    const createSession = (founding: string | null) => {
      // One coupon per checkout. The founding offer is the strongest, then the
      // activation offer, then the referral discount.
      const appliedCoupon = founding ?? activationCoupon ?? referralCoupon;
      const metadata = {
        user_id: user.id,
        plan: selectedPlan,
        currency: selectedCurrency,
        activation_offer: !founding && activationCoupon ? "true" : "false",
        referral_discount: !founding && !activationCoupon && referralCoupon ? "true" : "false",
        founding_centre: founding ? "true" : "false",
      };
      return stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        client_reference_id: user.id,
        payment_method_types: ["card"],
        ...(terms.noCardNeeded ? { payment_method_collection: "if_required" as const } : {}),
        line_items: [lineItem],
        // The plan rides along so the dashboard can greet a centre's free month
        // differently from a paid upgrade, before the webhook has landed.
        success_url: `${origin}/dashboard?upgraded=true&plan=${selectedPlan}`,
        cancel_url: `${origin}/billing`,
        allow_promotion_codes: !appliedCoupon,
        discounts: appliedCoupon ? [{ coupon: appliedCoupon }] : undefined,
        subscription_data: {
          // Stripe rejects trial_period_days: 0, so a returning centre simply
          // has no trial rather than a zero-length one.
          ...(terms.trialDays > 0 ? { trial_period_days: terms.trialDays } : {}),
          // With no card on file, the trial ends in a clean cancellation, never
          // a failed charge or a past-due account.
          ...(terms.noCardNeeded ? { trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}),
          metadata,
        },
        metadata,
      });
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await createSession(terms.foundingCoupon);
    } catch (error) {
      // The last founding spot can go between reading the count and this
      // request. Stripe then refuses the coupon; the centre still gets the
      // free month, just without the founding discount.
      if (!terms.foundingCoupon || !isCouponRefusal(error)) throw error;
      session = await createSession(null);
    }

    return NextResponse.json({ url: session.url, trialDays: terms.trialDays, noCardNeeded: terms.noCardNeeded, founding: Boolean(session.metadata?.founding_centre === "true") });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
