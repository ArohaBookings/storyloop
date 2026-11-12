import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where a brand-new free account lands after signing up.
 *
 * By default that is the guided first story (/generate?welcome=1), the step
 * worth protecting above all others. A link may ask for somewhere else with
 * `?next=`, but only a page on this short list: the statement guides send
 * readers with a class of statements to write straight to /statement (12 Nov
 * 2026). Anything else, including any other site, falls back to the first
 * story. safeRedirectPath already refuses other origins; the list also keeps a
 * crafted link from dropping a new educator somewhere confusing.
 */
export const FIRST_STORY_PATH = "/generate?welcome=1";

const SIGNUP_DESTINATIONS = new Set(["/statement"]);

export function signupDestination(next: string | null | undefined): string {
  const safe = safeRedirectPath(next, "");
  if (!safe) return FIRST_STORY_PATH;
  const path = safe.split(/[?#]/)[0].replace(/\/+$/, "");
  return SIGNUP_DESTINATIONS.has(path) ? path : FIRST_STORY_PATH;
}

/** The statement guides' "Start free" button. */
export const STATEMENT_SIGNUP_HREF = "/signup?next=/statement";
