import { safeRedirectPath } from "@/lib/safe-redirect";
import { FIRST_STORY_PATH, signupDestination } from "@/lib/signup-next";

export type AuthOutcome = "cancelled" | "failed" | "nosession" | "expired" | "different";

/**
 * Where a Google or emailed-link round trip that did not finish sends her
 * back: the page she started on (signup or sign-in) with a note, still
 * carrying the page she was heading for (19 Nov 2026: a cancelled Google
 * signup used to come back to a bare /signup, and the page she came for was
 * gone).
 *
 * `finishPath` is the /auth/finish address the round trip was meant to end on
 * (/auth/finish?next=...&intent=signup|login, see lib/auth/oauth.ts and
 * lib/auth/signup-link.ts). Pure; only same-site pages ever come out.
 */
export function authStartPage(finishPath: string, outcome: AuthOutcome, intentOverride?: "signup" | "login"): string {
  let next: string | null = null;
  let intent: "signup" | "login" = "login";
  try {
    const url = new URL(safeRedirectPath(finishPath, "/auth/finish"), "https://storyloop.space");
    next = url.searchParams.get("next");
    intent = url.searchParams.get("intent") === "signup" ? "signup" : "login";
  } catch {
    /* an unreadable address: the plain start page */
  }
  if (intentOverride) intent = intentOverride;

  const params = new URLSearchParams();
  if (intent === "signup") {
    if (outcome === "expired") params.set("link", "expired");
    else params.set("oauth", outcome === "different" ? "failed" : outcome);
    const destination = signupDestination(next);
    if (destination !== FIRST_STORY_PATH) params.set("next", destination);
    return `/signup?${params.toString()}`;
  }
  if (outcome === "expired") params.set("link", "expired");
  else params.set("oauth", outcome === "cancelled" || outcome === "different" ? outcome : "failed");
  const target = safeRedirectPath(next, "");
  if (target && target !== "/dashboard" && !target.startsWith("/login") && !target.startsWith("/signup") && !target.startsWith("/auth/")) {
    params.set("redirect", target);
  }
  return `/login?${params.toString()}`;
}
