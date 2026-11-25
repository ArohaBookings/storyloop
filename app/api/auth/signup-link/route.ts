import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { consumeRateLimit } from "@/lib/rate-limit";
import { verifyPass } from "@/lib/auth/human-pass";
import { DISPOSABLE_EMAIL_MESSAGE, isDisposableEmail } from "@/lib/auth/disposable-email";
import { SIGNUP_EMAIL_LINK_ON, signupLinkFinishPath } from "@/lib/auth/signup-link";
import { signupDestination } from "@/lib/signup-next";

const ALLOWED_PLANS = new Set(["free", "educator", "centre"]);
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * "Email me a link" (Proposal D, OFF: lib/auth/signup-link.ts). Makes or
 * signs in an account with a one-tap Supabase email link, no password.
 *
 * The same protections as /api/auth/signup, in the same order: the per-IP
 * signup limit (shared with password signups), the hidden trap field, a
 * real email that is not a throwaway inbox, and the quiet check's single-use
 * pass. On top: three links per address per 15 minutes.
 *
 * An email that already has an account gets a link that signs it in. The
 * answer is the same either way, so the form cannot tell anyone who is a
 * customer. The browser asks "Did you mean …?" for a mistyped domain first.
 *
 * Supabase sends the email (its own templates and SMTP). The implicit flow
 * puts the session in the link's return address, so the link works in any
 * browser, including one that is not the browser that asked for it.
 */
export async function POST(request: NextRequest) {
  if (!SIGNUP_EMAIL_LINK_ON) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
    if (!(await consumeRateLimit({ scope: "signup", key: ip, limit: 8, windowSeconds: 60 * 60 }))) {
      return NextResponse.json({ error: "Too many sign-ups from this internet connection in the last hour. Please try again in an hour.", code: "rate_limited" }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ error: "Your link wasn't sent. Please refresh the page and try again.", code: "bot_check" }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (!email) return NextResponse.json({ error: "Please add your email", code: "missing_email" }, { status: 400 });
    if (!EMAIL_SHAPE.test(email) || email.length > 200) return NextResponse.json({ error: "Please check your email address", code: "invalid_email" }, { status: 400 });
    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: DISPOSABLE_EMAIL_MESSAGE, field: "email", code: "disposable_email" }, { status: 400 });
    }
    const pass = verifyPass(body.humanPass, body.humanProof);
    if (!pass.ok) {
      return NextResponse.json({ error: "Your link wasn't sent. Please refresh the page and try again.", code: "human_check_failed", reason: pass.reason }, { status: 400 });
    }
    if (!(await consumeRateLimit({ scope: "human-pass-used", key: pass.nonce, limit: 1, windowSeconds: 3 * 60 * 60 }))) {
      return NextResponse.json({ error: "Your link wasn't sent. Please refresh the page and try again.", code: "human_check_reused" }, { status: 400 });
    }
    if (!(await consumeRateLimit({ scope: "signup-link", key: email, limit: 3, windowSeconds: 15 * 60 }))) {
      return NextResponse.json({ error: "We've sent a few links to this address already. Check your inbox and spam folder, or try again in 15 minutes.", code: "rate_limited" }, { status: 429 });
    }

    const requestedPlan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "free";
    const plan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : "free";
    const next = signupDestination(typeof body.next === "string" ? body.next : null);
    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}${signupLinkFinishPath(next)}`,
        // Only used when the link makes a new account (existing ones keep theirs).
        data: { ...(name ? { full_name: name } : { name_skipped: true }), plan_intent: plan, signup_via: "link" },
      },
    });
    if (error) {
      console.error("Signup link error:", error.status, error.code ?? error.message);
      if (error.status === 429) {
        return NextResponse.json({ error: "We've sent a few links to this address already. Check your inbox and spam folder, or try again in a few minutes.", code: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "We couldn't send the link just then. Please try again, or sign up with a password.", code: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup link error:", error);
    return NextResponse.json({ error: "We couldn't send the link just then. Please try again, or sign up with a password.", code: "server_error" }, { status: 500 });
  }
}
