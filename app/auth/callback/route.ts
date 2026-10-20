import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where Supabase sends the browser back after Google (and after email links
 * that use the code flow). Every way out lands on a page that says what
 * happened; none is a dead end or a raw error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  // Back to the page they started on: a signup that was cancelled goes back
  // to the signup form, not to "Welcome back".
  const startedOnSignup = /[?&]intent=signup(&|$)/.test(redirect);
  const startPage = startedOnSignup ? "/signup" : "/login";

  // Google (or the person) said no. "access_denied" is the Cancel button on
  // Google's screen; anything else is a Google or Supabase problem.
  const error = searchParams.get("error");
  if (error) {
    const cancelled = error === "access_denied";
    if (!cancelled) console.error("OAuth callback error:", error, searchParams.get("error_code") ?? "");
    return NextResponse.redirect(new URL(`${startPage}?oauth=${cancelled ? "cancelled" : "failed"}`, origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      // A refresh or a second tab replays a code that was already used. If
      // the first one signed them in, carry on instead of calling it a failure.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("OAuth code exchange failed:", exchangeError.message);
        return NextResponse.redirect(new URL(`${startPage}?oauth=failed`, origin));
      }
    }
  }

  return NextResponse.redirect(new URL(redirect, origin));
}
