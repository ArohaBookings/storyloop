import { NextRequest, NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { createCardUpdateSession } from "@/lib/billing-manage";

/** Open StoryLoop's card page (Stripe Checkout in setup mode, StoryLoop-branded). */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getOrCreateProfile(user);
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: "There is no billing account on this login yet." }, { status: 404 });
    const session = await createCardUpdateSession(createStripe(), {
      customerId: profile.stripe_customer_id,
      userId: user.id,
      origin: request.nextUrl.origin,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Card page error:", error);
    return NextResponse.json({ error: "Could not open the card page. Please try again." }, { status: 500 });
  }
}
