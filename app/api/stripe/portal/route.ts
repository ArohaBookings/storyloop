import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { storyLoopPortalConfigurationId } from "@/lib/stripe-portal";

function getStripe() {
  return createStripe();
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

    const configuration = await storyLoopPortalConfigurationId(stripe);
    const open = (withConfiguration: boolean) =>
      stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id!,
        return_url: `${origin}/billing`,
        ...(withConfiguration && configuration ? { configuration } : {}),
      });
    let session;
    try {
      session = await open(true);
    } catch (error) {
      // A configuration Stripe no longer accepts must not lock anyone out of
      // their own billing.
      if (!configuration) throw error;
      console.error("Portal with StoryLoop configuration failed, opening the default:", error);
      session = await open(false);
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
