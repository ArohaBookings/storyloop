import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { CENTRE_START_NO_CHECKOUT } from "@/lib/build-switches";
import { checkoutNow, createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMembership } from "@/lib/centres";
import { getPlanByKey, normalizePlanKey, type CurrencyCode } from "@/lib/plans";
import { checkoutTerms, foundingCouponId, foundingSpotsLeft, isCentrePlan, isCouponRefusal } from "@/lib/centre-offer";
import { resolveVerifiedPriceId } from "@/lib/stripe-prices";
import { ensureCustomer } from "@/lib/stripe-customer";
import { updateProfileForSubscription } from "@/lib/stripe-profile-sync";
import { createCentreForOwner } from "@/lib/centre-create";
import { claimLeaderOffer, joinFromLeaderOffer } from "@/lib/leader-offer-server";
import { hashOfferRef } from "@/lib/story-check-token";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { isLiveStatus, startFreeCentreName, startFreeDecision, startFreeTrialEnd } from "@/lib/centre-start";

/**
 * POST /api/centres/start-free: a leader starts her centre free until
 * 31 January 2027 with no payment page (25 Nov 2026, switch
 * CENTRE_START_NO_CHECKOUT, lib/centre-start.ts).
 *
 * Contract:
 *   request  { offerRef?: string, centreName?: string, plan?: centre_starter|centre_growth, currency?: NZD|AUD }
 *   success  200 { centreId: string | null, trialEndsAt: string }  (null: no name known yet, /centre asks for it)
 *   failure  { error, code: needs_checkout | already | unauthenticated }  needs_checkout means
 *            "use today's no-card checkout page": the caller always has a way on.
 *
 * Order: Stripe subscription -> profile sync -> create centre -> claim offer ->
 * joinFromLeaderOffer (seats follow the now-live plan).
 */
export type StartFreeRequest = { offerRef?: string; centreName?: string; plan?: string; currency?: string };
export type StartFreeResponse = { centreId: string | null; trialEndsAt: string } | { error: string; code: string };

const needsCheckout = (detail = "") => {
  if (detail) console.error("Centre start falls back to checkout:", detail);
  return NextResponse.json<StartFreeResponse>({ error: "Use the checkout page.", code: "needs_checkout" }, { status: 409 });
};

export async function POST(request: NextRequest) {
  if (!CENTRE_START_NO_CHECKOUT) return needsCheckout();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<StartFreeResponse>({ error: "Sign in first.", code: "unauthenticated" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as StartFreeRequest;
  const plan = normalizePlanKey(body.plan ?? "centre_starter");
  if (!isCentrePlan(plan)) return needsCheckout();
  const currency: CurrencyCode = body.currency === "NZD" ? "NZD" : body.currency === "AUD" ? "AUD" : "NZD";
  if (!(await consumeRateLimit({ scope: "centre-start-free", key: user.id, limit: 5, windowSeconds: 3600 }))) return needsCheckout("rate limited");

  const now = checkoutNow(request.headers.get("x-storyloop-test-now"));
  const admin = createAdminSupabase();
  try {
    const profile = await getOrCreateProfile(user);
    const stripe = createStripe();
    const membership = await getMembership(user.id);
    let hadCentreBefore = false;
    if (profile.stripe_customer_id) {
      const previous = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 20 });
      hadCentreBefore = previous.data.some((sub) => isCentrePlan(sub.metadata?.plan));
    }
    const decision = startFreeDecision({
      switchOn: true,
      inCentre: Boolean(membership),
      hasLiveSub: Boolean(profile.stripe_subscription_id) && isLiveStatus(profile.subscription_status),
      liveSubIsCentre: isCentrePlan(profile.plan),
      hadCentreBefore,
    });
    if (decision === "already") return NextResponse.json<StartFreeResponse>({ error: "Your centre is already set up.", code: "already" }, { status: 409 });
    if (decision === "needs_checkout") return needsCheckout();

    const terms = checkoutTerms({ plan, spotsLeft: await foundingSpotsLeft(stripe), hadCentreBefore, couponId: foundingCouponId(), now });
    if (!terms.noCardNeeded || terms.trialDays <= 0) return needsCheckout();
    const trialEnd = startFreeTrialEnd(now);
    const customerId = await ensureCustomer({ stripe, supabase, user, profile });

    const cents = getPlanByKey(plan).price[currency] * 100;
    let priceId = await resolveVerifiedPriceId(stripe, plan, currency, cents, { live: (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live") });
    if (!priceId) {
      // The same price checkout would build inline, made once here because a
      // subscription made by API needs a price object.
      const price = await stripe.prices.create({
        currency: currency.toLowerCase(),
        unit_amount: cents,
        recurring: { interval: "month" },
        product_data: { name: `StoryLoop ${getPlanByKey(plan).name}`, metadata: { plan } },
      });
      priceId = price.id;
    }

    const create = (founding: string | null) =>
      stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: priceId as string }],
          trial_end: Math.floor(trialEnd.getTime() / 1000),
          // With no card on file, the free period ends in a clean cancellation, never a failed charge.
          trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          ...(founding ? { discounts: [{ coupon: founding }] } : {}),
          // The same keys checkout puts on subscription_data, so everything downstream reads it the same way.
          metadata: {
            app: "storyloop",
            user_id: user.id,
            plan,
            currency,
            activation_offer: "false",
            referral_discount: "false",
            founding_centre: founding ? "true" : "false",
            trial_days: String(terms.trialDays),
            trial_end: trialEnd.toISOString(),
            no_card: "true",
            source: "start_free",
          },
        },
        // A double tap makes one subscription.
        { idempotencyKey: `start-free-${user.id}${founding ? "" : "-plain"}` },
      );
    let subscription: Stripe.Subscription;
    try {
      subscription = await create(terms.foundingCoupon);
    } catch (error) {
      // The last founding spot can go between the count and this call: the free period still stands.
      if (!terms.foundingCoupon || !isCouponRefusal(error)) throw error;
      subscription = await create(null);
    }

    // From here the centre's subscription exists: nothing below may send her to checkout
    // (that would make a second one). Each step fails on its own; /centre picks up the rest.
    await updateProfileForSubscription(admin, subscription, { userId: user.id, plan, customerId }).catch((error) => console.error("Start-free profile sync failed (the webhook repeats it):", error));
    return NextResponse.json<StartFreeResponse>(await afterSubscription({ userId: user.id, body, now, trialEnd }));
  } catch (error) {
    // Never a dead end: today's no-card checkout page takes over.
    return needsCheckout(String(error instanceof Error ? error.message : error));
  }
}

/** The centre, the offer and the join, once the subscription exists. Never throws. */
async function afterSubscription({ userId, body, now, trialEnd }: { userId: string; body: StartFreeRequest; now: Date; trialEnd: Date }): Promise<{ centreId: string | null; trialEndsAt: string }> {
  const admin = createAdminSupabase();
  try {
    const user = { id: userId };
    let fromSet = false;
    let offerName: string | null = null;
    if (body.offerRef) {
      const offer = await claimLeaderOffer(user.id, body.offerRef, now);
      offerName = offer?.centreName ?? null;
      if (offer) {
        const { data: setRow } = await admin.from("leader_sets").select("id").eq("offer_ref_hash", hashOfferRef(body.offerRef)).maybeSingle();
        fromSet = Boolean(setRow);
      }
    }
    const name = startFreeCentreName(body.centreName, offerName);
    let centreId: string | null = null;
    let joined = false;
    if (name) {
      const made = await createCentreForOwner(user.id, name);
      if (made.ok) {
        centreId = made.centre.id;
        joined = (await joinFromLeaderOffer(user.id, centreId)).joined;
      }
    }
    await recordServerEvent(admin, {
      event: "centre_started_free",
      userId: user.id,
      path: "/api/centres/start-free",
      metadata: { from: body.offerRef ? (fromSet ? "leader_set" : "leader_check") : "direct", educator_joined: joined },
    }).catch(() => undefined);
    return { centreId, trialEndsAt: trialEnd.toISOString() };
  } catch (error) {
    console.error("Start-free after the subscription failed; /centre asks for the rest:", error);
    return { centreId: null, trialEndsAt: trialEnd.toISOString() };
  }
}
