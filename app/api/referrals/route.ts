import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import {
  getOrCreateReferralCode,
  MAX_REFERRAL_CREDITS,
  REFERRED_DISCOUNT_PERCENT,
} from "@/lib/referrals";
import { SITE_URL } from "@/lib/email/config";

/** Current user's referral code, progress, and whether to show the intro modal. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  const code = await getOrCreateReferralCode(user.id);
  const admin = createAdminSupabase();

  const [{ count: credited }, { count: pending }, { data: profileRow }] = await Promise.all([
    admin.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id).eq("status", "credited"),
    admin.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user.id).eq("status", "pending"),
    admin.from("profiles").select("referral_modal_seen_at, referred_by").eq("id", user.id).maybeSingle(),
  ]);

  return NextResponse.json({
    code,
    shareUrl: code ? `${SITE_URL}/signup?ref=${code}` : null,
    earned: credited ?? 0,
    pending: pending ?? 0,
    max: MAX_REFERRAL_CREDITS,
    remaining: Math.max(0, MAX_REFERRAL_CREDITS - (credited ?? 0)),
    discountPercent: REFERRED_DISCOUNT_PERCENT,
    // The intro modal is shown once, ever. After dismissal it lives in Support.
    showIntro: !profileRow?.referral_modal_seen_at,
    wasReferred: Boolean(profileRow?.referred_by),
    planName: profile.plan ?? "free",
  });
}

/** Dismiss the one-time intro modal. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.action !== "dismiss_intro") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  await admin
    .from("profiles")
    .update({ referral_modal_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
