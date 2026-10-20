"use client";

/**
 * Google Ads conversion measurement (21 Oct 2026, Leo: "connect it so Google
 * can see if there's been a conversion, so it can push further").
 *
 * The Google tag (components/analytics/GoogleAdsTag.tsx) runs only on the live
 * site, in consent mode: until a visitor chooses "Allow" on the cookie banner,
 * Google sets no cookies and gets a cookie-free signal instead; with "Allow" it
 * may use its advertising cookies to match a conversion to the ad click. Ad
 * personalisation (remarketing) stays off either way. Nothing about a story or
 * a child is ever sent: only that an account was created or a plan started.
 *
 * The ids are public by design (they appear in every page that runs the tag).
 */

export const GOOGLE_ADS_ID = "AW-18526197738";
/** "StoryLoop account created" (Sign-up, primary, NZ$10, one per click). */
export const SIGNUP_SEND_TO = "AW-18526197738/AalsCMewrqMdEOqv_YFF";
/** "StoryLoop paid plan started" (Subscribe, primary, real value, one per click). */
export const PAID_SEND_TO = "AW-18526197738/LlksCMGNsKMdEOqv_YFF";

type Gtag = (...args: unknown[]) => void;

function gtagFn(): Gtag | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof fn === "function" ? fn : null;
}

/** The consent-mode state for a cookie-banner choice. Pure. */
export function adsConsentFor(choice: "all" | "essential" | null) {
  const granted = choice === "all" ? "granted" : "denied";
  return {
    ad_storage: granted,
    ad_user_data: granted,
    // Never used: no remarketing lists, no personalised ads.
    ad_personalization: "denied",
    // StoryLoop's own analytics are first-party; Google Analytics is not used.
    analytics_storage: "denied",
  } as const;
}

export function updateAdsConsent(choice: "all" | "essential" | null) {
  gtagFn()?.("consent", "update", adsConsentFor(choice));
}

/**
 * Sends one conversion and resolves when Google has it, or after `timeoutMs`
 * at the latest, so a page can wait briefly before navigating away. Never
 * throws and never blocks longer than the timeout; without the tag (local,
 * preview, tests, blocked by an extension) it resolves at once.
 */
function sendConversion(params: Record<string, unknown>, timeoutMs = 1200): Promise<void> {
  const gtag = gtagFn();
  if (!gtag) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    try {
      gtag("event", "conversion", {
        ...params,
        event_callback: () => {
          window.clearTimeout(timer);
          finish();
        },
        event_timeout: timeoutMs,
      });
    } catch {
      window.clearTimeout(timer);
      finish();
    }
  });
}

/** A new StoryLoop account (email or Google). Call once, before navigating on. */
export function reportSignupConversion(): Promise<void> {
  return sendConversion({ send_to: SIGNUP_SEND_TO, value: 10.0, currency: "NZD" });
}

/**
 * Resolves once window.gtag exists, or after `maxMs`. GoogleAdsTag's scripts
 * load from an effect, and React runs a page's own effects (the dashboard's,
 * on the way back from Stripe) before the layout's, so on first load a page
 * can be ready before the tag is.
 */
function waitForGtag(maxMs: number): Promise<void> {
  if (typeof window === "undefined" || gtagFn()) return Promise.resolve();
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (gtagFn() || Date.now() - started >= maxMs) {
        window.clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}

/**
 * A paid plan started (Stripe checkout completed). `transactionId` (the Stripe
 * checkout session) lets Google drop a duplicate if the page is reloaded.
 * Nothing waits on this, so it can afford to wait for the tag first.
 */
export async function reportPaidConversion({ value, currency, transactionId }: { value: number; currency: string; transactionId?: string | null }): Promise<void> {
  await waitForGtag(8000);
  return sendConversion({
    send_to: PAID_SEND_TO,
    value,
    currency: currency.toUpperCase(),
    ...(transactionId ? { transaction_id: transactionId } : {}),
  });
}
