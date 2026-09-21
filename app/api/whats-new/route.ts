import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateReferralCode, MAX_REFERRAL_CREDITS, REFERRED_DISCOUNT_PERCENT } from "@/lib/referrals";
import { shouldShowWhatsNew, WHATS_NEW_VERSION } from "@/lib/whats-new";
import { SITE_URL } from "@/lib/email/config";

/** Stories an educator must have written before we ask them to refer anyone. */
const REFERRAL_INTRO_MIN_STORIES = 3;

/** What the welcome card should show this user, if anything. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("whats_new_seen_version, referral_modal_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  const showWhatsNew = shouldShowWhatsNew();

  // Never ask a new educator to refer people before they have written anything.
  // Signup -> first story is the step we are protecting, so the referral intro
  // waits until the tool has actually earned the ask. One story is not enough
  // to be pleased by: it takes a few before someone would put their name to it.
  let showReferralIntro = false;
  if (!profile?.referral_modal_seen_at) {
    const { count: written } = await admin
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    showReferralIntro = (written ?? 0) >= REFERRAL_INTRO_MIN_STORIES;
  }

  // Only pay the cost of creating a code when the card will actually be shown.
  let code: string | null = null;
  if (showWhatsNew || showReferralIntro) {
    code = await getOrCreateReferralCode(user.id);
  }

  const { count: earned } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id)
    .eq("status", "credited");

  return NextResponse.json({
    userId: user.id,
    showWhatsNew,
    showReferralIntro,
    version: WHATS_NEW_VERSION,
    code,
    shareUrl: code ? `${SITE_URL}/signup?ref=${code}` : null,
    earned: earned ?? 0,
    max: MAX_REFERRAL_CREDITS,
    discountPercent: REFERRED_DISCOUNT_PERCENT,
  });
}

/** Dismiss both pages at once: closing the card means "do not show me again". */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.action !== "dismiss") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const { error } = await createAdminSupabase()
    .from("profiles")
    .update({
      whats_new_seen_version: WHATS_NEW_VERSION,
      referral_modal_seen_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Could not persist What's New dismissal:", error.message);
    return NextResponse.json({ error: "Could not save dismissal" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
