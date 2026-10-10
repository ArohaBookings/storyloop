import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { loadBillingSummary, type BillingSummary } from "@/lib/billing-manage";

export const dynamic = "force-dynamic";

const EMPTY: BillingSummary = { subscription: null, card: null, receipts: [] };

/** The signed-in account's plan, card and receipts, for the Billing page. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getOrCreateProfile(user);
    if (!profile?.stripe_customer_id) return NextResponse.json(EMPTY);
    const summary = await loadBillingSummary(createStripe(), profile.stripe_customer_id, profile.stripe_subscription_id ?? null);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Billing summary failed:", error);
    return NextResponse.json({ ...EMPTY, error: "Could not load your billing details. Please refresh." }, { status: 500 });
  }
}
