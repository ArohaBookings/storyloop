import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { createStripe } from "@/lib/stripe-client";
import { readEducatorDiscount } from "@/lib/wall-offer-server";

/**
 * GET: which discount Educator checkout will apply for the signed-in account
 * when a wall opens it ("activation", "referral" or "none"), so the wall can
 * state the money checkout will really charge (lib/wall-offer.ts). Her own
 * account only; nothing is written. When it cannot be read, "none": the wall
 * then states the plain price, never a discount checkout might not give.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const profile = await getOrCreateProfile(user);
    const discount = await readEducatorDiscount({
      admin: createAdminSupabase(),
      stripe: createStripe(),
      userId: user.id,
      plan: profile.plan,
      stripeCustomerId: profile.stripe_customer_id,
    });
    return NextResponse.json({ discount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Checkout offer read failed:", error);
    return NextResponse.json({ discount: "none" }, { headers: { "Cache-Control": "no-store" } });
  }
}
