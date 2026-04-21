import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const obj = event.data.object as Stripe.Subscription | Stripe.Checkout.Session;
        const userId = obj.metadata?.user_id;
        const plan = obj.metadata?.plan ?? "educator";
        if (!userId) break;

        const subId = "subscription" in obj ? (obj.subscription as string) : obj.id;
        const sub = typeof subId === "string" ? await stripe.subscriptions.retrieve(subId) : null;
        if (!sub) break;

        await admin.from("profiles").update({
          plan,
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await admin.from("profiles").update({
          plan: "free",
          subscription_status: "cancelled",
          stripe_subscription_id: null,
        }).eq("id", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: profile } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).single();
        if (profile) await admin.from("profiles").update({ subscription_status: "past_due" }).eq("id", profile.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }

  return NextResponse.json({ received: true });
}
