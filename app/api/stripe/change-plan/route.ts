import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getPlanByKey } from "@/lib/plans";
import { checkPlanChange, planChangeSummary, planProductId, type SubscriptionFacts } from "@/lib/plan-change";
import { configuredPriceId } from "@/lib/stripe-prices";

/**
 * Switch a paying customer between paid plans. GET previews exactly what will
 * happen; POST does it. All rules are in lib/plan-change.ts.
 */

function getStripe() {
  return createStripe();
}

function facts(subscription: Stripe.Subscription): SubscriptionFacts {
  return {
    id: subscription.id,
    status: subscription.status,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    metadataUserId: subscription.metadata?.user_id ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    cancelAt: typeof subscription.cancel_at === "number" ? subscription.cancel_at : null,
    itemCount: subscription.items.data.length,
    currency: subscription.currency,
  };
}

async function load(targetPlan: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;

  const profile = await getOrCreateProfile(user);
  const stripe = getStripe();
  let subscription: Stripe.Subscription | null = null;
  if (profile.stripe_subscription_id) {
    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    } catch {
      subscription = null;
    }
  }

  const check = checkPlanChange({
    profile: {
      userId: user.id,
      plan: profile.plan,
      stripeSubscriptionId: profile.stripe_subscription_id ?? null,
      stripeCustomerId: profile.stripe_customer_id ?? null,
    },
    subscription: subscription ? facts(subscription) : null,
    targetPlan,
  });
  return { user, stripe, subscription, check } as const;
}

async function ensurePlanProduct(stripe: Stripe, plan: Parameters<typeof planProductId>[0]) {
  const id = planProductId(plan);
  try {
    const product = await stripe.products.retrieve(id);
    if (product.active) return product.id;
  } catch {
    // Not created yet.
  }
  const definition = getPlanByKey(plan);
  const product = await stripe.products.create({
    id,
    name: `StoryLoop ${definition.name}`,
    description: definition.description,
    metadata: { app: "storyloop", plan },
  });
  return product.id;
}

export async function GET(request: NextRequest) {
  try {
    const loaded = await load(request.nextUrl.searchParams.get("plan"));
    if ("error" in loaded) return loaded.error;
    if (!loaded.check.ok) return NextResponse.json({ ok: false, message: loaded.check.message, reason: loaded.check.reason });
    return NextResponse.json({ ok: true, ...planChangeSummary(loaded.check), direction: loaded.check.direction });
  } catch (error) {
    console.error("Plan change preview failed:", error);
    return NextResponse.json({ ok: false, message: "Could not check that plan change. Please try again." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const loaded = await load(body.plan);
    if ("error" in loaded) return loaded.error;
    const { user, stripe, subscription, check } = loaded;
    if (!check.ok || !subscription) {
      return NextResponse.json({ ok: false, message: check.ok ? "Could not load your subscription." : check.message }, { status: 400 });
    }

    const item = subscription.items.data[0];
    const priceId = configuredPriceId(check.to, check.currency);
    const itemUpdate: Stripe.SubscriptionUpdateParams.Item = priceId
      ? { id: item.id, price: priceId }
      : {
          id: item.id,
          price_data: {
            currency: check.currency.toLowerCase(),
            product: await ensurePlanProduct(stripe, check.to),
            unit_amount: getPlanByKey(check.to).price[check.currency] * 100,
            recurring: { interval: "month" },
          },
        };

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [itemUpdate],
      proration_behavior: "create_prorations",
      // The webhook reads the plan from metadata, so it must move with the price.
      metadata: { ...subscription.metadata, plan: check.to, previous_plan: check.from },
    });

    // The webhook will confirm this; writing it now means the page is right
    // the moment it reloads. Only the plan changes here.
    try {
      await createAdminSupabase().from("profiles").update({ plan: check.to }).eq("id", user.id);
    } catch (error) {
      console.error("Plan changed in Stripe; profile will sync from the webhook:", error);
    }

    console.info("Plan changed", { userId: user.id, from: check.from, to: check.to, subscription: updated.id });
    return NextResponse.json({ ok: true, plan: check.to });
  } catch (error) {
    console.error("Plan change failed:", error);
    return NextResponse.json(
      { ok: false, message: "Stripe could not change your plan. Nothing was changed. Please try again or contact support." },
      { status: 500 },
    );
  }
}
