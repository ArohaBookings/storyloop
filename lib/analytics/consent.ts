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
 * Where the visitor is decides the default (lib/analytics/consent-region.ts):
 * in the EU, EEA, UK and Switzerland no choice yet counts as "essential" and
 * full measurement starts only after "Allow"; elsewhere (New Zealand,
 * Australia) there is no banner and no choice counts as "all", until the
 * visitor picks "Essential only" in Cookie preferences. A browser sending
 * Global Privacy Control is treated as having chosen "essential" and is not asked.
 *
 * The choice is a first-party cookie so the server can read it too.
 */

import { effectiveConsent, parseRegion, REGION_COOKIE, type ConsentChoice, type ConsentRegion } from "./consent-region";

export type { ConsentChoice } from "./consent-region";

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

/** "ask" (EU, EEA, UK, Switzerland, or unknown) or "open", from the cookie middleware.ts sets. */
export function consentRegion(): ConsentRegion {
  if (typeof document === "undefined") return "ask";
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REGION_COOKIE}=([a-z]+)(?:;|$)`));
    return parseRegion(match?.[1]);
  } catch {
    return "ask";
  }
}

/** The choice that applies: the visitor's own answer, or the default for where they are. */
export function currentConsent(): ConsentChoice | null {
  return effectiveConsent({ explicit: readConsent(), region: consentRegion(), privacySignal: privacySignal() });
}

/** Full measurement with "Allow", or by default outside the ask region. */
export function fullTracking(): boolean {
  return currentConsent() === "all";
}

export function consentLevel(): ConsentChoice | "unset" {
  return currentConsent() ?? "unset";
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
