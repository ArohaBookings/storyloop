import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getOrCreateReferralCode, recordReferralSignup } from "@/lib/referrals";
import { incrementAccessCodeRedemption, resolveAccessCode } from "@/lib/access-codes";
import { mergeStoryPreferences } from "@/lib/story-options";
import { sendLifecycleEmail } from "@/lib/email/send";

/**
 * Finishes a "Continue with Google" sign-in (20 Oct 2026).
 *
 * An email signup gets its profile, referral credit, access code, source and
 * welcome email in /api/auth/signup. A Google signup arrives through the OAuth
 * callback instead, so the browser calls this once it has a session, passing
 * what it remembered from before the redirect (the plan, a referral or access
 * code, where the visit came from).
 *
 * Three cases:
 * - New: the account has only a Google identity and has not been through
 *   here before (app_metadata.storyloop_onboarded_at). Set it up like an
 *   email signup. Only if it came from the sign-in page, ask first
 *   (needsConfirm): someone who meant to open an account under another email
 *   should not be dropped into an empty one without a word.
 * - Linked: an account that signed up with email and password, which
 *   Supabase has just joined to this Google login because the emails match.
 *   Nothing is set up again; the page says Google is now connected.
 * - Returning: anyone else. Nothing is stamped or sent.
 *
 * "Has an email identity" rather than "created in the last half hour": an
 * educator who signed up by email ten minutes ago and then tapped Google must
 * not get a second welcome or have their signup source overwritten.
 */
const LINKED_WINDOW_MS = 15 * 60 * 1000;

const str = (value: unknown, max = 120) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    /* an empty body still signs them in */
  }

  const identities = user.identities ?? [];
  const hasEmailIdentity = identities.some((identity) => identity.provider === "email");
  const google = identities.find((identity) => identity.provider === "google");
  const alreadyOnboarded = Boolean(user.app_metadata?.storyloop_onboarded_at);
  const isNew = !alreadyOnboarded && !hasEmailIdentity && Boolean(google);
  const email = user.email ?? "";

  if (!isNew) {
    const linkedAt = google?.created_at ? Date.parse(google.created_at) : NaN;
    const linked = hasEmailIdentity && Number.isFinite(linkedAt) && Date.now() - linkedAt < LINKED_WINDOW_MS;
    return NextResponse.json({ isNew: false, linked, email });
  }

  // From the sign-in page, a Google email with no account yet: ask before
  // setting anything up (welcome email, referral, source).
  if (body.intent === "login" && body.confirm !== true) {
    return NextResponse.json({ isNew: true, needsConfirm: true, email });
  }

  const profile = await getOrCreateProfile(user);
  const admin = createAdminSupabase();
  // Mark it first, so a double call (two tabs, a refresh) cannot run this twice.
  await admin.auth.admin
    .updateUserById(user.id, { app_metadata: { storyloop_onboarded_at: new Date().toISOString(), signup_method: "google" } })
    .then(undefined, (error) => console.error("OAuth onboarding mark failed:", error));

  try {
    await getOrCreateReferralCode(user.id);
    const referralCode = str(body.referralCode, 40);
    if (referralCode) await recordReferralSignup(user.id, referralCode);
  } catch (referralError) {
    console.error("Referral setup failed (Google signup unaffected):", referralError);
  }

  const attribution = body.attribution && typeof body.attribution === "object" ? (body.attribution as Record<string, unknown>) : null;
  if (attribution) {
    let referrerHost: string | null = null;
    const rawReferrer = str(attribution.referrer, 300);
    if (rawReferrer) {
      try {
        referrerHost = new URL(rawReferrer).hostname.replace(/^www\./, "").slice(0, 120);
      } catch {
        referrerHost = rawReferrer.replace(/^www\./, "").slice(0, 120);
      }
    }
    await admin
      .from("profiles")
      .update({
        signup_source: str(attribution.utmSource) ?? referrerHost,
        signup_campaign: str(attribution.utmCampaign),
        signup_referrer_host: referrerHost,
        signup_session_id: str(attribution.sessionId, 60),
      })
      .eq("id", user.id)
      .then(undefined, (error) => console.error("Google signup attribution failed:", error));
  }

  const plan = str(body.plan, 40) ?? "free";
  const accessCode = str(body.accessCode, 60);
  if (plan === "free" && accessCode) {
    const grant = await resolveAccessCode(accessCode, user.email);
    if (grant) {
      await admin
        .from("profiles")
        .update({
          monthly_story_limit_override: grant.monthlyStoryLimitOverride,
          applied_access_code: grant.code,
          story_preferences: mergeStoryPreferences(profile.story_preferences, grant.storyPreferences),
        })
        .eq("id", user.id);
      await incrementAccessCodeRedemption(grant.code);
    }
  }

  await sendLifecycleEmail({
    type: "welcome",
    userId: user.id,
    recipient: user.email ?? "",
    name: profile.full_name ?? "",
    metadata: { trigger: "signup", method: "google" },
  }).catch((emailError) => console.error("Welcome email error:", emailError));

  return NextResponse.json({ isNew: true, email });
}
