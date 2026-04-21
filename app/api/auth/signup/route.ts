import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PLANS = new Set(["free", "educator", "centre"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedPlan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "free";
    const plan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : "free";

    if (!name) {
      return NextResponse.json({ error: "Please add your name" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Please add your email" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const admin = createAdminSupabase();
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        plan_intent: plan,
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
