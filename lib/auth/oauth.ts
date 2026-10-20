"use client";

import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/client";

/**
 * "Continue with Google" (20 Oct 2026).
 *
 * Why: the signup form was name + email + password, and since 22 Sep a
 * breached password is refused. Every reviewer of the funnel (persona panel,
 * visitor simulation) put one-tap Google sign-up at the top of the signup
 * page fixes, and returning educators who forgot a password had only email.
 *
 * Supabase does the OAuth. The button appears only when Supabase will really
 * send the browser on to Google (see googleSignInEnabled), so the code can
 * ship before the Google Cloud client exists and no one sees a button that
 * fails.
 *
 * Someone who already has an account with the same email lands in that
 * account: Supabase links a Google identity to an existing user whose email
 * is confirmed, and every StoryLoop email signup is created confirmed
 * (app/api/auth/signup). /auth/finish says so ("Google is now connected").
 */

export type OAuthIntent = "signup" | "login";

export type OAuthContext = {
  intent: OAuthIntent;
  next: string;
  plan?: string | null;
  currency?: string | null;
  referralCode?: string | null;
  accessCode?: string | null;
  startedAt: number;
};

export const OAUTH_CONTEXT_KEY = "storyloop_oauth_ctx";

/**
 * Google refuses sign-in inside embedded browsers ("403 disallowed_useragent"),
 * which is where most Facebook visitors are. Better to say so than to send
 * them to an error page.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|LinkedInApp|Line\/|Snapchat|Twitter for|; wv\)/i.test(userAgent);
}

let enabledPromise: Promise<boolean> | null = null;

/**
 * Whether "Continue with Google" will work. Cached per page load; false on any doubt.
 *
 * Asks Supabase's authorize endpoint itself rather than /auth/v1/settings:
 * settings says google: true as soon as the switch is on, even with the
 * client secret missing (20 Oct 2026, exactly that), and then the button sent
 * people to a raw JSON error. Authorize answers a redirect to Google only when
 * the provider is really usable, and a 400 otherwise. The implicit-flow form
 * of the request stores nothing on the server; `redirect: "manual"` stops the
 * browser following it to Google.
 *
 * Settings is still asked first, so while Google is simply off nobody's
 * console shows a failed request on every sign-in page.
 */
export function googleSignInEnabled(): Promise<boolean> {
  if (enabledPromise) return enabledPromise;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || typeof window === "undefined") return (enabledPromise = Promise.resolve(false));
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  const probe = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${window.location.origin}/auth/callback`)}`;
  enabledPromise = fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: controller.signal })
    .then((res) => (res.ok ? res.json() : null))
    .then((settings) =>
      settings?.external?.google
        ? fetch(probe, { redirect: "manual", credentials: "omit", cache: "no-store", signal: controller.signal }).then(
            (res) => res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400),
          )
        : false,
    )
    .catch(() => false)
    .finally(() => window.clearTimeout(timer));
  return enabledPromise;
}

export function readOAuthContext(): OAuthContext | null {
  try {
    const raw = window.sessionStorage.getItem(OAUTH_CONTEXT_KEY) ?? window.localStorage.getItem(OAUTH_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthContext;
    // Older than an hour: a stale attempt, not this one.
    if (!parsed || typeof parsed.startedAt !== "number" || Date.now() - parsed.startedAt > 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOAuthContext() {
  try {
    window.sessionStorage.removeItem(OAUTH_CONTEXT_KEY);
    window.localStorage.removeItem(OAUTH_CONTEXT_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Sends the browser to Google. Returns an error message if it could not start. */
export async function startGoogleSignIn(context: Omit<OAuthContext, "startedAt">): Promise<string | null> {
  const full: OAuthContext = { ...context, startedAt: Date.now() };
  try {
    // Session storage survives the round trip in the same tab; local storage
    // covers a browser that opens the return in a new tab.
    const value = JSON.stringify(full);
    window.sessionStorage.setItem(OAUTH_CONTEXT_KEY, value);
    window.localStorage.setItem(OAUTH_CONTEXT_KEY, value);
  } catch {
    /* storage blocked: the account is still created, just without the plan or referral */
  }
  track("oauth_started", { provider: "google", intent: context.intent });
  // The intent rides in the URL too, so a browser that blocks storage still
  // knows whether this was a sign-in or a signup.
  const finish = `/auth/finish?next=${encodeURIComponent(context.next)}&intent=${context.intent}`;
  const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(finish)}`;
  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  if (error) {
    track("oauth_error", { provider: "google", intent: context.intent, stage: "start" });
    return "Google sign-in is not available right now. Use your email below.";
  }
  return null;
}
