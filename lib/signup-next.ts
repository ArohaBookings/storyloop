import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where a brand-new free account lands after signing up.
 *
 * By default that is the guided first story (/generate?welcome=1), the step
 * worth protecting above all others. A link may ask for somewhere else with
 * `?next=`, but only a page of the signed-in app on the list below: the
 * statement guides send readers with a class of statements to write straight
 * to /statement (12 Nov 2026), and a signed-out visit to a page such as
 * /statement goes to sign in and, for someone new, on to create an account
 * and back to that page (19 Nov 2026; before then the redirect was dropped on
 * the way to signup, so a new educator never reached the page she came for).
 *
 * Path only: no query and no deeper page (a child's page belongs to someone
 * else's account). /generate, /dashboard and /billing are the app's front
 * doors, so a new account starts on the guided first story instead.
 * Anything else, including any other site, falls back to the first story.
 * safeRedirectPath already refuses other origins; the list also keeps a
 * crafted link from dropping a new educator somewhere confusing.
 */
export const FIRST_STORY_PATH = "/generate?welcome=1";

/** Pages of the signed-in app (app/(app)/<page>) a new account may land on when she came for them. */
export const SIGNUP_DESTINATIONS: ReadonlySet<string> = new Set([
  "/statement",
  "/children",
  "/today",
  "/year",
  "/group",
  "/room",
  "/evidence",
  "/insights",
  "/planning",
  "/practice",
  "/history",
  "/voices",
  "/wall",
  "/pickup",
  "/reliever",
  "/roi",
  "/centre",
  "/centre-tools",
  "/team",
  "/support",
  "/feedback",
]);

/** The app's front doors: a new account starts on the guided first story when she asked for one of these. */
export const SIGNUP_FRONT_DOORS: ReadonlySet<string> = new Set(["/generate", "/dashboard", "/billing"]);

/** The path of a safe same-site address, without query, hash or a trailing slash ("" when unsafe). */
function safePathOnly(next: string | null | undefined): string {
  const safe = safeRedirectPath(next, "");
  if (!safe) return "";
  return safe.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

export function signupDestination(next: string | null | undefined): string {
  const path = safePathOnly(next);
  return SIGNUP_DESTINATIONS.has(path) ? path : FIRST_STORY_PATH;
}

/** Pages only someone who already pays has a reason to open (an emailed receipt, an upgrade link). */
const ACCOUNT_ONLY: ReadonlySet<string> = new Set(["/billing"]);

/**
 * Whether a sign-in redirect points into the signed-in app (a page on the list
 * or a front door, or a page below one of them), so the sign-in page offers a
 * new visitor a free account as clearly as it offers sign-in. Billing keeps
 * the plain "Welcome back": the people sent there already have an account.
 */
export function isAppDestination(next: string | null | undefined): boolean {
  const path = safePathOnly(next);
  if (!path || path === "/") return false;
  const top = `/${path.split("/")[1]}`;
  if (ACCOUNT_ONLY.has(top)) return false;
  return SIGNUP_DESTINATIONS.has(top) || SIGNUP_FRONT_DOORS.has(top);
}

/** The create-account link for someone on her way to `next`: the page rides along when signup can honour it. */
export function signupPathFor(next: string | null | undefined): string {
  const destination = signupDestination(next);
  return destination === FIRST_STORY_PATH ? "/signup" : `/signup?next=${encodeURIComponent(destination)}`;
}

/** The sign-in link from the signup page, keeping where a new account was heading. */
export function loginPathForDestination(destination: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (destination !== FIRST_STORY_PATH) params.set("redirect", destination);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

/**
 * Where someone who already has an account goes after signing in from the
 * signup page: the page she came for, home instead of the new-account
 * first story, and Billing when she had picked a paid plan (her account may
 * already have one, so checkout is started from there, never twice).
 */
export function existingAccountDestination(destination: string, plan: string): string {
  if (plan !== "free") return "/billing";
  return destination === FIRST_STORY_PATH ? "/dashboard" : destination;
}

/** The statement guides' "Start free" button. */
export const STATEMENT_SIGNUP_HREF = "/signup?next=/statement";
