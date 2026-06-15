import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { incrementAccessCodeRedemption, resolveAccessCode } from "@/lib/access-codes";
import { mergeStoryPreferences } from "@/lib/story-options";
import { consumeRateLimit } from "@/lib/rate-limit";

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

    return NextResponse.json({
      success: true,
      userId: createdUser.user?.id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 500 }
    );
  }
}
