"use client";

/**
 * The visitor's cookie choice, and the one place every tracker asks about it.
 *
 * Two levels:
 * - "essential": what the site needs to work and to count itself. Page views
 *   and sign-up and checkout steps are recorded against an id that lives only
 *   in this tab and is gone when it closes. Nothing about clicks, reading or
 *   devices, and nothing kept between visits.
 * - "all": everything EngagementTracker measures (clicks, reading depth, time
 *   per section, rage clicks, form drop-off, page speed, screen size), against
 *   an id kept between visits so returning visitors are known.
 *
 * No choice yet counts as "essential": full measurement starts only after
 * "Allow". A browser sending Global Privacy Control is treated as having chosen
 * "essential" and is not asked.
 *
 * The choice is a first-party cookie so the server can read it too.
 */

export type ConsentChoice = "all" | "essential";

export const CONSENT_COOKIE = "sl_consent";
export const CONSENT_CHANGED = "storyloop:consent-changed";
export const CONSENT_OPEN = "storyloop:consent-open";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(/(?:^|;\s*)sl_consent=(all|essential)(?:;|$)/);
    return match ? (match[1] as ConsentChoice) : null;
  } catch {
    return null;
  }
}

/** True when the browser asks sites not to track it (Global Privacy Control). */
export function privacySignal(): boolean {
  try {
    return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  } catch {
    return false;
  }
}

/** Full measurement only with an explicit "Allow". */
export function fullTracking(): boolean {
  return readConsent() === "all";
}

export function consentLevel(): ConsentChoice | "unset" {
  return readConsent() ?? "unset";
}

export function writeConsent(choice: ConsentChoice) {
  if (typeof document === "undefined") return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* cookies blocked: the banner simply asks again next visit */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED, { detail: choice }));
}

export function openConsentPreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONSENT_OPEN));
}
