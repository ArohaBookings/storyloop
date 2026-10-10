import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { applySavedCard } from "@/lib/billing-manage";

/**
 * Back from the card page: make the new card the one StoryLoop charges, and pay
 * anything overdue with it. The webhook does the same, so whichever lands first
 * wins and the other is a no-op.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getOrCreateProfile(user);
    if (!profile?.stripe_customer_id) return NextResponse.json({ ok: false, reason: "no_customer" }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" && /^cs_[A-Za-z0-9_]+$/.test(body.sessionId) ? body.sessionId : null;
    if (!sessionId) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
    const result = await applySavedCard(createStripe(), { sessionId, customerId: profile.stripe_customer_id });
    return NextResponse.json(result, { status: result.ok ? 200 : result.reason === "not_yours" ? 403 : 409 });
  } catch (error) {
    console.error("Card confirm error:", error);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
