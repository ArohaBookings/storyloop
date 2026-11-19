import { checkoutReturnPath } from "@/lib/app-wall";
import { normalizePlanKey } from "@/lib/plans";

/**
 * Back from Stripe Checkout (review 1, R1-01): Stripe sends her first to
 * /upgraded, a page with no child, story or note on it, where the Google Ads
 * "paid plan started" conversion is sent; then on to the page she came from,
 * which greets her exactly as before (?upgraded=true&plan=...&session_id=...).
 * Ad tags never load on the app pages themselves (lib/analytics/ad-free-pages.ts).
 */
export const PAID_RETURN_PATH = "/upgraded";

/** A Stripe Checkout session id, or null. Pure. */
export function safeSessionId(raw: unknown): string | null {
  return typeof raw === "string" && /^cs_[A-Za-z0-9_]{6,200}$/.test(raw) ? raw : null;
}

/** The page after /upgraded: a wall's page from the short list, otherwise the dashboard. Pure. */
export function paidReturnTarget(to: unknown, plan: unknown, sessionId: unknown): string {
  const page = checkoutReturnPath(to) ?? "/dashboard";
  const params = new URLSearchParams({ upgraded: "true", plan: normalizePlanKey(typeof plan === "string" ? plan : undefined) });
  const session = safeSessionId(sessionId);
  if (session) params.set("session_id", session);
  return `${page}?${params.toString()}`;
}

/** Stripe's success_url: /upgraded, carrying where to go next. Pure. */
export function paidReturnSuccessUrl(origin: string, returnPath: string | null, plan: string): string {
  const params = new URLSearchParams({ to: returnPath ?? "/dashboard", plan });
  // Stripe fills {CHECKOUT_SESSION_ID} in; it de-duplicates the conversion on reload. Left unencoded on purpose.
  return `${origin}${PAID_RETURN_PATH}?${params.toString()}&session_id={CHECKOUT_SESSION_ID}`;
}
