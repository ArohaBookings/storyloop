import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { OFFER_REASON_COPY, WINBACK_LABEL, WINBACK_MONTHS, WINBACK_OFFER_ID, WINBACK_PERCENT_OFF, longDay, winbackEligibility } from "@/lib/offers";

/**
 * Whether this account holds a live welcome-back offer (lib/offers.ts), so the
 * billing page only ever shows a discount checkout will really apply.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ eligible: false, reason: "signed_out" }, { status: 401 });
  const profile = await getOrCreateProfile(user);
  const { data: grant } = await createAdminSupabase()
    .from("offer_grants")
    .select("id, expires_at, redeemed_at, clicked_at")
    .eq("user_id", user.id)
    .eq("offer_id", WINBACK_OFFER_ID)
    .maybeSingle();
  const eligibility = winbackEligibility({ profile, grant });
  if (!eligibility.eligible) {
    return NextResponse.json({ eligible: false, reason: eligibility.reason, message: OFFER_REASON_COPY[eligibility.reason] });
  }
  if (grant && !grant.clicked_at) {
    await createAdminSupabase().from("offer_grants").update({ clicked_at: new Date().toISOString() }).eq("id", grant.id);
  }
  return NextResponse.json({
    eligible: true,
    label: WINBACK_LABEL,
    percentOff: WINBACK_PERCENT_OFF,
    months: WINBACK_MONTHS,
    expiresOn: grant ? longDay(new Date(grant.expires_at)) : null,
  });
}
