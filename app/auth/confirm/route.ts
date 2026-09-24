import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where a one-tap sign-in link lands (lib/email/sign-in-link.ts): the token is
 * exchanged for a session, then the person goes where they were heading.
 * A used or expired link goes to sign in, with a note.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const redirect = safeRedirectPath(searchParams.get("redirect"));

  if (tokenHash && (type === "magiclink" || type === "email")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(redirect, origin));
  }
  return NextResponse.redirect(new URL(`/login?link=expired&redirect=${encodeURIComponent(redirect)}`, origin));
}
