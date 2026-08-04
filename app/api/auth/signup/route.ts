import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateReferralCode, recordReferralSignup } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { incrementAccessCodeRedemption, resolveAccessCode } from "@/lib/access-codes";
import { mergeStoryPreferences } from "@/lib/story-options";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendLifecycleEmail } from "@/lib/email/send";

const ALLOWED_PLANS = new Set(["free", "educator", "centre"]);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const allowed = await consumeRateLimit({
      scope: "signup",
      key: ip,
      limit: 8,
      windowSeconds: 60 * 60,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedPlan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "free";
    const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";
    const plan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : "free";
    const accessCodeGrant = plan === "free" && accessCode ? await resolveAccessCode(accessCode, email) : null;

    if (!name) {
      return NextResponse.json({ error: "Please add your name" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Please add your email" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (accessCode && !accessCodeGrant) {
      return NextResponse.json({ error: "That access code is invalid, expired, or already used." }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        plan_intent: plan,
        access_code: accessCodeGrant?.code ?? null,
      },
    });

    if (createError) {
      const message = createError.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        return NextResponse.json(
          { error: "That email already has an account. Sign in instead." },
          { status: 409 }
        );
      }
      throw createError;
    }

    if (createdUser.user) {
      await getOrCreateProfile(createdUser.user);

      // Give every account its own share code, and attribute this signup to a
      // referrer if they arrived through one. Both are best-effort: a referral
      // problem must never stop someone creating an account.
      try {
        await getOrCreateReferralCode(createdUser.user.id);
        const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : "";
        if (referralCode) await recordReferralSignup(createdUser.user.id, referralCode);
      } catch (referralError) {
        console.error("Referral setup failed (signup unaffected):", referralError);
      }

      // Stamp where this signup came from so paid campaigns can be measured.
      // Best-effort only: attribution must never block account creation.
      const attribution = body.attribution && typeof body.attribution === "object" ? body.attribution : null;
      if (attribution) {
        const str = (value: unknown, max = 120) =>
          typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
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
          .eq("id", createdUser.user.id)
          .then(undefined, (error) => console.error("Signup attribution failed:", error));
      }
    }

    if (createdUser.user && accessCodeGrant) {
      const profile = await getOrCreateProfile(createdUser.user);
      await admin
        .from("profiles")
        .update({
          monthly_story_limit_override: accessCodeGrant.monthlyStoryLimitOverride,
          applied_access_code: accessCodeGrant.code,
          story_preferences: mergeStoryPreferences(profile.story_preferences, accessCodeGrant.storyPreferences),
        })
        .eq("id", createdUser.user.id);
      await incrementAccessCodeRedemption(accessCodeGrant.code);
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.error("Post-signup sign-in error:", signInError);
      return NextResponse.json(
        {
          error: "Your account was created, but we could not start your session automatically. Please sign in.",
        },
        { status: 500 }
      );
    }

    if (createdUser.user) {
      await sendLifecycleEmail({
        type: "welcome",
        userId: createdUser.user.id,
        recipient: createdUser.user.email ?? email,
        name,
        metadata: { trigger: "signup" },
      }).catch((emailError) => {
        console.error("Welcome email error:", emailError);
      });
    }

    return NextResponse.json({
      success: true,
      userId: createdUser.user?.id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    // Signup is public and on the conversion path. Internal messages are
    // meaningless to a visitor and expose our stack, so they stay in the logs.
    // Expected problems (email taken, weak password) are returned earlier with
    // their own specific messages and never reach here.
    return NextResponse.json(
      { error: "We could not create your account just then. Please try again." },
      { status: 500 }
    );
  }
}
