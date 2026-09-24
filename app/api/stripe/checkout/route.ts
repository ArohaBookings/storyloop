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
import { CHECKOUT_BRANDING, checkoutTermsMessage, isBrandingRefusal } from "@/lib/stripe-branding";
import { OFFER_REASON_COPY, PRO_MONTH_OFFER_ID, PRO_MONTH_PLAN, PRO_MONTH_TRIAL_DAYS, proMonthEligibility } from "@/lib/offers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordServerEvent } from "@/lib/analytics/server";

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

    const body = await request.json();
    const { currency, activationOffer } = body;
    const offer = body.offer === "pro_month" ? "pro_month" : null;
    const browserSession = typeof body.sessionId === "string" ? body.sessionId.slice(0, 60) : null;
    const selectedCurrency = normaliseCurrency(currency);
    // The free-month offer is always Educator Pro, whatever the page sent.
    const selectedPlan = offer === "pro_month" ? PRO_MONTH_PLAN : normalizePlanKey(body.plan);
    if (selectedPlan === "free") {
      return NextResponse.json({ error: "Choose a paid plan before starting checkout" }, { status: 400 });
    }

    const profile = await getOrCreateProfile(user);
    const admin = createAdminSupabase();

    // The offer is only honoured for the account it was granted to, once, and
    // before it expires. Everything else gets the normal terms or a clear no.
    let offerGrantId: string | null = null;
    if (offer === "pro_month") {
      const [{ data: grant }, { data: memberships }] = await Promise.all([
        admin.from("offer_grants").select("id, expires_at, redeemed_at").eq("user_id", user.id).eq("offer_id", PRO_MONTH_OFFER_ID).maybeSingle(),
        admin.from("centre_members").select("centre_id").eq("user_id", user.id).eq("status", "active").limit(1),
      ]);
      const eligibility = proMonthEligibility({ profile, grant, isCentreMember: Boolean(memberships?.length) });
      if (!eligibility.eligible) {
        return NextResponse.json({ error: OFFER_REASON_COPY[eligibility.reason], reason: eligibility.reason }, { status: 409 });
      }
      offerGrantId = grant?.id ?? null;
    }

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
      !offer && activationOffer === true && profile.plan === "free"
        ? await resolveActivationCoupon(
            stripe.coupons,
            await getRuntimeSecret("STRIPE_FIRST_MONTH_COUPON_ID", "stripe_first_month_coupon_id"),
          )
        : undefined;

    // Someone who signed up through a referral link gets 10% off their first
    // month. The activation offer wins if both apply, because Stripe accepts
    // only one coupon per checkout and the activation offer is the stronger one.
    let referralCoupon: string | undefined;
    if (!activationCoupon && !offer) {
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
    const terms = offer === "pro_month"
      ? { trialDays: PRO_MONTH_TRIAL_DAYS, noCardNeeded: false, foundingCoupon: null }
      : checkoutTerms({
          plan: selectedPlan,
          spotsLeft: isCentrePlan(selectedPlan) ? await foundingSpotsLeft(stripe) : null,
          hadCentreBefore,
          couponId: foundingCouponId(),
        });
    const lineItem = await buildLineItem(stripe, selectedPlan, selectedCurrency);

    const createSession = (founding: string | null, branded = true) => {
      // One coupon per checkout. The founding offer is the strongest, then the
      // activation offer, then the referral discount.
      const appliedCoupon = founding ?? activationCoupon ?? referralCoupon;
      const metadata = {
        // Marks StoryLoop's own checkouts on the shared Stripe account.
        app: "storyloop",
        user_id: user.id,
        plan: selectedPlan,
        currency: selectedCurrency,
        activation_offer: !founding && activationCoupon ? "true" : "false",
        referral_discount: !founding && !activationCoupon && referralCoupon ? "true" : "false",
        founding_centre: founding ? "true" : "false",
        // The terms this checkout offered, so a follow-up email can restate
        // them exactly instead of guessing.
        trial_days: String(terms.trialDays),
        no_card: terms.noCardNeeded ? "true" : "false",
        ...(offer === "pro_month" ? { offer_id: PRO_MONTH_OFFER_ID } : {}),
      };
      return stripe.checkout.sessions.create({
        ...(branded ? { branding_settings: CHECKOUT_BRANDING } : {}),
        custom_text: {
          submit: {
            message: checkoutTermsMessage({
              plan: selectedPlan,
              currency: selectedCurrency,
              trialDays: terms.trialDays,
              noCardNeeded: terms.noCardNeeded,
              founding: Boolean(founding),
              offer,
            }),
          },
        },
        customer: customerId,
        mode: "subscription",
        client_reference_id: user.id,
        payment_method_types: ["card"],
        ...(terms.noCardNeeded ? { payment_method_collection: "if_required" as const } : {}),
        line_items: [lineItem],
        // The plan rides along so the dashboard can greet a centre's free month
        // differently from a paid upgrade, before the webhook has landed.
        success_url: `${origin}/dashboard?upgraded=true&plan=${selectedPlan}`,
        cancel_url: `${origin}/billing?checkout=cancelled&plan=${selectedPlan}`,
        // A free month is the whole offer; a promotion code on top of it is not.
        allow_promotion_codes: !appliedCoupon && !offer,
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

    // Branding first; if Stripe ever refuses it, the same checkout without it.
    const createBrandedSession = async (founding: string | null) => {
      try {
        return await createSession(founding, true);
      } catch (error) {
        if (!isBrandingRefusal(error)) throw error;
        console.error("Checkout branding refused, continuing without it:", error);
        return createSession(founding, false);
      }
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await createBrandedSession(terms.foundingCoupon);
    } catch (error) {
      // The last founding spot can go between reading the count and this
      // request. Stripe then refuses the coupon; the centre still gets the
      // free month, just without the founding discount.
      if (!terms.foundingCoupon || !isCouponRefusal(error)) throw error;
      session = await createBrandedSession(null);
    }

    // The funnel: who opened Stripe, for which plan, on which terms. Stamped
    // after the session exists and never allowed to fail the checkout.
    await Promise.allSettled([
      recordServerEvent(admin, {
        event: "checkout_started",
        userId: user.id,
        sessionId: browserSession,
        path: "/api/stripe/checkout",
        metadata: {
          plan: selectedPlan,
          currency: selectedCurrency,
          trial_days: terms.trialDays,
          no_card: terms.noCardNeeded,
          offer: offer ?? undefined,
          checkout_session: session.id,
        },
      }),
      offerGrantId
        ? admin.from("offer_grants").update({ checkout_started_at: new Date().toISOString(), checkout_session_id: session.id }).eq("id", offerGrantId)
        : Promise.resolve(),
    ]);

    return NextResponse.json({ url: session.url, trialDays: terms.trialDays, noCardNeeded: terms.noCardNeeded, founding: Boolean(session.metadata?.founding_centre === "true") });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
