/**
 * What the sign-in page says when a password sign-in is refused (19 Nov 2026).
 *
 * The sign-in page is now the first stop for a new educator who opened a page
 * of the app (/login?redirect=/statement), so it must never show a raw error.
 * Until now anything but a wrong password was shown as Supabase worded it
 * ("Failed to fetch", "User is banned", "Request rate limit reached"). Every
 * line here ends in a next step. Pure.
 */
export type SignInFailure = { message?: string | null; status?: number | null; code?: string | null };

export function signInErrorMessage(error: SignInFailure, options: { googleOn: boolean; offerSignup: boolean }): string {
  const message = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  const status = error.status ?? 0;

  // A wrong password, or an account that only ever used Google.
  if (code === "invalid_credentials" || /invalid login credentials/.test(message)) {
    return `That email and password don't match.${options.googleOn ? " If you signed up with Google, use Continue with Google above." : ""} Or reset your password below.${options.offerSignup ? " New here? Create a free account above." : ""}`;
  }
  if (code === "email_not_confirmed" || /email not confirmed/.test(message)) {
    return "This email isn't confirmed yet. Use 'Email me a sign-in link instead' below: the link confirms it and signs you in.";
  }
  if (code === "user_banned" || /banned/.test(message)) {
    return "This account has been disabled. Contact support if you think this is a mistake.";
  }
  if (status === 429 || code === "over_request_rate_limit" || /rate limit|too many/.test(message)) {
    return "Too many sign-in tries in a short time. Wait a few minutes and try again, or reset your password below.";
  }
  if (!status || /failed to fetch|networkerror|load failed|network/.test(message)) {
    return "We couldn't reach StoryLoop. Check your internet connection and try again.";
  }
  return "Sign-in didn't work just then. Please try again in a moment, or use 'Email me a sign-in link instead' below.";
}
