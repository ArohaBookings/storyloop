/**
 * Where the cookie banner is needed (21 Oct 2026).
 *
 * The EU, the EEA, the UK and Switzerland require a visitor's agreement before
 * analytics or advertising cookies; New Zealand and Australia (StoryLoop's
 * market) do not, as long as the privacy policy says what is collected. About
 * 2 in 3 visitors never answered the banner, so for most of them neither
 * StoryLoop's own analytics nor Google Ads could see what worked. Now:
 * - "ask" region: the banner asks, exactly as before. Nothing beyond page views
 *   and funnel steps until "Allow".
 * - "open" region: no banner. Treated as "Allow" unless the visitor chose
 *   "Essential only" (Cookie preferences, in the footer) or their browser sends
 *   Global Privacy Control.
 *
 * middleware.ts sets the region cookie from the visitor's country (Vercel's
 * x-vercel-ip-country). An unknown country is "ask", so the default is the
 * careful one. Ad personalisation stays off everywhere (lib/analytics/google-ads.ts).
 *
 * No "use client": the browser (lib/analytics/consent.ts), the server
 * (/api/track) and middleware all use these.
 */

export type ConsentChoice = "all" | "essential";
export type ConsentRegion = "ask" | "open";

export const REGION_COOKIE = "sl_region";

/** EU 27, the rest of the EEA (Iceland, Liechtenstein, Norway), the UK and Switzerland. */
const ASK_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
]);

export function regionForCountry(country: string | null | undefined): ConsentRegion {
  const code = typeof country === "string" ? country.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(code)) return "ask";
  return ASK_COUNTRIES.has(code) ? "ask" : "open";
}

export function parseRegion(value: string | null | undefined): ConsentRegion {
  return value === "open" ? "open" : "ask";
}

/**
 * The choice that applies. An explicit answer always wins; then Global Privacy
 * Control means "essential"; then an "open" region means "all"; otherwise no
 * choice yet (which counts as "essential" for what gets recorded).
 */
export function effectiveConsent({
  explicit,
  region,
  privacySignal,
}: {
  explicit: ConsentChoice | null | undefined;
  region: ConsentRegion;
  privacySignal: boolean;
}): ConsentChoice | null {
  if (explicit === "all" || explicit === "essential") return explicit;
  if (privacySignal) return "essential";
  return region === "open" ? "all" : null;
}
