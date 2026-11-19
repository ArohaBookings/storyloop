/**
 * "Email me a link" on the signup page (Proposal D, 18 Nov 2026): an account
 * with no password, made from a one-tap Supabase email link.
 *
 * OFF until Leo switches it on. When this is false the button is not drawn
 * and /api/auth/signup-link answers 404. Before switching it on, the
 * production Supabase dashboard needs the items in
 * storyloop-ops/build-2026-11-18/progress/signup.json ("production"): the
 * redirect URL allow-list, custom SMTP with a sending limit above Supabase's
 * default, and the Magic Link and Confirm signup email templates.
 *
 * SECURITY, before switching it on (review 1, R1-05): /auth/finish signs the
 * browser in with the session in the link's # part. While this is false it
 * ignores that part entirely. Switched on as built, anyone could send an
 * educator a real storyloop.space link carrying THEIR OWN session and sign
 * her into their account (she would then write about children into it). So
 * first add a guard: accept a link session only in the browser that asked for
 * the link (a one-time value kept in this browser when she taps "Email me a
 * link" and checked on arrival), or move to the token_hash flow /auth/confirm
 * uses, and show "Signed in as <email>" on arrival.
 */
export const SIGNUP_EMAIL_LINK_ON = false;

/** Where the link lands: /auth/finish reads the session from the address and finishes the signup. */
export function signupLinkFinishPath(next: string): string {
  return `/auth/finish?next=${encodeURIComponent(next)}&intent=signup&method=link`;
}

/** The two values in the address a Supabase email link brings back (implicit flow), or null. */
export function sessionFromHash(hash: string): { access_token: string; refresh_token: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  return access && refresh ? { access_token: access, refresh_token: refresh } : null;
}

/** A link that came back with an error in the address (expired, already used). */
export function linkErrorFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_code") ?? params.get("error");
}
