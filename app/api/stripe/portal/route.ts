import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const stripe = getStripe();
    const origin = new URL(request.url).origin;

    const profile = await getOrCreateProfile(user);
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: "No billing account found" }, { status: 404 });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
