import { safeRedirectPath } from "@/lib/safe-redirect";

/** Request header the middleware sets to the path being visited (it overwrites any value a client sends). */
export const VISITED_PATH_HEADER = "x-storyloop-path";

/**
 * The sign-in URL for someone who is signed out, keeping where they were going.
 * A bare /login used to forget it: an email's "Upgrade, 15% off" button opened
 * on a phone signed out and ended on the dashboard with the offer gone.
 */
export function loginPathFor(visitedPath: string | null | undefined) {
  if (!visitedPath) return "/login";
  const target = safeRedirectPath(visitedPath, "");
  return target && !target.startsWith("/login") ? `/login?redirect=${encodeURIComponent(target)}` : "/login";
}
