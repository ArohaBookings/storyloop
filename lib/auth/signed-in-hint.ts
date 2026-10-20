/**
 * "Has this browser signed in to StoryLoop?" for marketing pages, without
 * loading Supabase (19 Oct 2026).
 *
 * About half of the real Google homepage visits were existing educators
 * coming back to sign in. The header offered only "Start free", so they
 * landed on the signup form, went back and hunted for "Sign in". The Supabase
 * session cookie (sb-<project>-auth-token, possibly split into .0/.1) is
 * readable by the page, so its presence is a good enough hint to offer
 * "Open StoryLoop" instead. It is only a hint: the app checks the real session
 * and sends anyone signed out to sign in and back (lib/auth/login-redirect.ts).
 */
export function hasSignedInHint(cookie: string = typeof document === "undefined" ? "" : document.cookie): boolean {
  return cookie
    .split(";")
    .some((part) => /^\s*sb-[^=]+-auth-token(\.\d+)?=./.test(part));
}
