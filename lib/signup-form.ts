/**
 * The signup page's own checks and words (18 Nov 2026). Pure, so the unit
 * tests read exactly what a visitor reads.
 *
 * Every error ends in a next step: which box to fix, a button that fixes it,
 * or where to go instead. The codes are the listed ones in
 * lib/analytics/events.ts (SIGNUP_ERROR_CODES), so signup_error says which
 * rule stopped her, never what she typed.
 */

import type { SIGNUP_LEFT_STATES } from "@/lib/analytics/events";

export type SignupField = "name" | "email" | "password" | "access_code" | "plan" | "currency";
export type SignupLeftState = (typeof SIGNUP_LEFT_STATES)[number];

export type SignupErrorView = {
  /** A listed signup_error code ("checkout_failed" is shown, but recorded by checkout itself). */
  code: string;
  message: string;
  /** The box the fix belongs to, if any. */
  field?: "name" | "email" | "password" | "access_code";
  /** A one-tap way on, when the fix is not in a box. */
  action?: "refresh" | "sign_in" | "billing";
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The browser's own checks, in order, before anything is sent. Null when the form can go. */
export function checkSignupForm(input: {
  name: string;
  email: string;
  password: string;
  /** suggestEmailFix(email): a likely mistyped domain, or null. */
  typo: string | null;
  /** She has already seen "Did you mean" for this address and kept hers. */
  typoAccepted: boolean;
}): SignupErrorView | null {
  const email = input.email.trim();
  if (!input.name.trim()) return { code: "missing_name", field: "name", message: "Please add your name." };
  if (!email) return { code: "missing_email", field: "email", message: "Please add your email." };
  if (!EMAIL_SHAPE.test(email)) {
    return { code: "invalid_email", field: "email", message: "That email doesn't look complete. It needs an @ and a full stop, like you@centre.co.nz." };
  }
  if (input.typo && !input.typoAccepted) return { code: "email_typo", field: "email", message: `Did you mean ${input.typo}?` };
  if (!input.password) return { code: "missing_password", field: "password", message: "Please choose a password." };
  if (input.password.length < 6) return { code: "short_password", field: "password", message: "Password must be at least 6 characters." };
  return null;
}

/** What she reads for a refusal from the server (or the network), with its next step. */
export function signupErrorView(code: string, serverMessage: string): SignupErrorView {
  switch (code) {
    case "email_exists":
      return { code, message: "You already have a StoryLoop account with this email." };
    case "pwned_password":
    case "short_password":
    case "missing_password":
      return { code, field: "password", message: serverMessage || "Please choose another password, or let us make one for you." };
    case "missing_name":
      return { code, field: "name", message: "Please add your name." };
    case "missing_email":
    case "invalid_email":
      return { code, field: "email", message: "Please check your email address." };
    case "disposable_email":
      return { code, field: "email", message: serverMessage || "Please use the email address you check every day." };
    case "bad_access_code":
      return { code, field: "access_code", message: "That access code is invalid, expired, or already used." };
    case "rate_limited":
      return { code, message: "Too many sign-ups from this internet connection in the last hour. Please try again in an hour." };
    case "bot_check":
    case "human_check_failed":
    case "human_check_reused":
      return { code, action: "refresh", message: "Your account wasn't created: our quick robot check didn't finish in this browser. Refresh the page and try again." };
    case "session_failed":
      return { code, action: "sign_in", message: "Your account is ready. Sign in with the email and password you just chose." };
    case "checkout_failed":
      return { code: "checkout_failed", action: "billing", message: "Your account is ready, but checkout didn't open. Open Billing to start your trial." };
    case "network":
      return { code, message: "We couldn't reach StoryLoop. Check your internet connection and try again." };
    case "timeout":
      return { code: "network", message: "That took too long, so we stopped waiting. Check your connection and press Create again. If your account was made, we'll tell you." };
    default:
      return { code: code === "server_error" ? code : "unknown", message: "We couldn't create your account just then. Please try again in a moment." };
  }
}

/** The kind of screen, from its width (the same breaks as the page's layout). */
export function deviceForWidth(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * "Not now?" under the form: one tap, fixed answers, nothing typed. Keys are
 * the listed exit reasons (lib/exit-feedback.ts, STOP_REASONS); no_new_login
 * was added for this page. Never names another product.
 */
export const SIGNUP_NOT_NOW_REASONS = [
  { key: "want_to_see_more", label: "I want to see more first" },
  { key: "no_new_login", label: "I don't want another login" },
  { key: "too_busy", label: "Too busy right now" },
  { key: "privacy_policy", label: "Privacy, or my centre's rules" },
  { key: "price", label: "The price" },
  { key: "something_else", label: "Something else" },
] as const;
