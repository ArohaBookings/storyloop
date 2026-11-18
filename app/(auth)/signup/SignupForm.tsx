"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Wand2 } from "lucide-react";
import { getPlanByKey, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { captureAttribution, getAttribution, getSessionId, track } from "@/lib/analytics/client";
import { suggestPassphrase } from "@/lib/passphrase";
import { hasSignedInHint } from "@/lib/auth/signed-in-hint";
import GoogleButton from "@/components/auth/GoogleButton";
import { googleSignInEnabled, isInAppBrowser, rememberOAuthContext } from "@/lib/auth/oauth";
import { SIGNUP_EMAIL_LINK_ON } from "@/lib/auth/signup-link";
import { suggestEmailFix } from "@/lib/email-typo";
import { reportSignupConversion } from "@/lib/analytics/google-ads";
import { takeHumanPass, warmHumanPass } from "@/lib/auth/human-pass-client";
import { confirmKeptDrafts, readKeptStatement, readKeptStory } from "@/lib/keep-story";
import { trackEvent } from "@/lib/analytics/track-event";
import type { SIGNUP_ERROR_CODES } from "@/lib/analytics/events";
import { FIRST_STORY_PATH, signupDestination } from "@/lib/signup-next";
import { OFFER_STORAGE_KEY, offerRefFromHash, offerStorageValue } from "@/lib/story-check";
import { educatorOffer } from "@/lib/offer-wording";
import CentreTrialWords from "@/components/centre/CentreTrialWords";
import {
  SIGNUP_NOT_NOW_REASONS,
  checkSignupForm,
  deviceForWidth,
  signupErrorView,
  type SignupErrorView,
  type SignupField,
  type SignupLeftState,
} from "@/lib/signup-form";

type SignupErrorCode = (typeof SIGNUP_ERROR_CODES)[number];

function normaliseCurrency(value: string | null): CurrencyCode {
  return value === "NZD" ? "NZD" : "AUD";
}

/** How long a request may take before she is told, with a next step. */
const PASS_WAIT_MS = 15_000;
const REQUEST_WAIT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([promise, new Promise<"timeout">((resolve) => window.setTimeout(() => resolve("timeout"), ms))]);
}

/**
 * The signup page (18 Nov 2026 rebuild of the first screen).
 *
 * The data: leavers went in a median 6 seconds, the Create button sat 1.13
 * phone screens down, and nothing recorded an error shown in the browser, a
 * Google cancel or why anyone left. Now, on a 393 by 673 phone, Google, the
 * three fields, the plan and the button are all on the first screen; every
 * error has a next step; and the events in lib/analytics/events.ts say where
 * she stopped (field names, codes and seconds only, never what she typed).
 *
 * The plan arrives from the server with the page, so a director who clicked
 * "Claim a founding spot" sees the centre wording from the first frame.
 */
export default function SignupForm({ initialPlan = null }: { initialPlan?: string | null }) {
  const [name, setName] = useState("");
  // Already signed in on this device: point them back into the app.
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  // The address she said is right after "Did you mean": not asked twice.
  const typoCheckedFor = useRef<string | null>(null);
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  // Collapsed by default; opens when a code arrives in the link.
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<SignupErrorView | null>(null);
  const [notice, setNotice] = useState("");
  const [googleOn, setGoogleOn] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [cookiesOff, setCookiesOff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [plan, setPlan] = useState<PlanKey>(() => normalizePlanKey(initialPlan));
  // The paid plan offered beside Free: the one the link asked for, else Educator.
  const [paidOption, setPaidOption] = useState<PlanKey>(() => {
    const linked = normalizePlanKey(initialPlan);
    return linked === "free" ? "educator" : linked;
  });
  // A story written in the demo, or a statement drafted on a guide, before
  // signing up, waiting for the new account (lib/keep-story.ts).
  const [keptWaiting, setKeptWaiting] = useState<"story" | "statement" | "summary" | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  const [referralCode, setReferralCode] = useState("");
  // Where a free account lands: the first story, unless the link asked for a
  // page on the short list in lib/signup-next.ts (the statement guides send /statement).
  const [destination, setDestination] = useState(FIRST_STORY_PATH);
  const [notNow, setNotNow] = useState<"closed" | "open" | "answered">("closed");
  // "Email me a link" (lib/auth/signup-link.ts, OFF until Leo switches it on).
  const [mode, setMode] = useState<"password" | "link" | "link_sent">("password");

  // Why she leaves (signup_left), and where she stopped.
  const openedAt = useRef(0);
  const last = useRef<SignupLeftState>("untouched");
  const focused = useRef(new Set<SignupField>());
  const done = useRef(false);
  const leftSent = useRef(false);
  // A second tap on Create while the first is on its way does nothing.
  const submitting = useRef(false);
  const seconds = () => Math.max(0, Math.round((Date.now() - openedAt.current) / 1000));

  useEffect(() => {
    openedAt.current = Date.now();
    setSignedIn(hasSignedInHint());
    const params = new URLSearchParams(window.location.search);
    const embedded = isInAppBrowser(navigator.userAgent);
    setInApp(embedded);
    setCookiesOff(navigator.cookieEnabled === false);
    googleSignInEnabled().then(setGoogleOn).catch(() => {});
    const oauth = params.get("oauth");
    if (oauth === "cancelled") setNotice("Google sign-in was cancelled. Try again, or sign up with your email.");
    if (oauth === "failed" || oauth === "nosession") setNotice("Google sign-in didn't finish. Try again, or sign up with your email.");
    if (params.get("link") === "expired") setNotice("That link has expired or was already used. Ask for a new one, or sign up with a password.");
    if (oauth === "cancelled" || oauth === "failed" || oauth === "nosession") {
      trackEvent("oauth_cancelled", {
        provider: "google",
        stage: oauth === "cancelled" ? "access_denied" : oauth === "nosession" ? "no_session" : "unknown",
        in_app: embedded,
      });
    }
    const selectedPlan = normalizePlanKey(params.get("plan") ?? initialPlan);
    const selectedCurrency = params.get("currency");
    const code = params.get("code");
    // A kept statement opens on /statement, where it is shown again; a kept story goes to the first story.
    // Drafts kept without a tap count too (lib/keep-story.ts); having been shown
    // here, they go into the new account on its first load.
    const keptStory = readKeptStory({ includeUnconfirmed: true });
    const keptStatement = keptStory ? null : readKeptStatement({ includeUnconfirmed: true });
    confirmKeptDrafts();
    const kept = keptStory ? "story" : keptStatement ? (keptStatement.mode === "summary" ? "summary" : "statement") : null;
    setKeptWaiting(kept);
    if (kept) trackEvent("signup_draft_carried", { kind: kept });
    setDestination(keptStatement && !params.get("next") ? "/statement" : signupDestination(params.get("next")));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPlan(selectedPlan);
    if (selectedPlan !== "free") setPaidOption(selectedPlan);
    setCurrency(selectedCurrency ? normaliseCurrency(selectedCurrency) : tz?.includes("Auckland") ? "NZD" : "AUD");
    if (code) {
      setAccessCode(code);
      setShowAccessCode(true);
    }
    // Referral links look like /signup?ref=ABC1234. Remembered so the referrer
    // still gets credit even if the visitor edits the form first.
    let ref: string | null = params.get("ref");
    try {
      ref = ref ?? window.localStorage.getItem("storyloop_ref");
      if (ref) window.localStorage.setItem("storyloop_ref", ref.trim().toUpperCase());
    } catch {
      /* storage blocked: the referral rides in this page's state only */
    }
    if (ref) setReferralCode(ref.trim().toUpperCase());
    // A leader starting the team's month from a story an educator sent: the
    // offer reference rides after the # (never sent to a server) and waits here
    // for the centre's set-up screen (app/(app)/centre, lib/leader-offer-server.ts).
    const offerRef = offerRefFromHash(window.location.hash);
    if (offerRef) {
      try { window.localStorage.setItem(OFFER_STORAGE_KEY, offerStorageValue(offerRef)); } catch {}
    }
    captureAttribution();
    // Where the visit started (a page path only), the kind of screen, and
    // whether this is Facebook's or Instagram's own browser.
    const landing = (getAttribution().landingPath ?? window.location.pathname).toLowerCase();
    trackEvent("signup_view", {
      entry: landing,
      device: deviceForWidth(window.innerWidth),
      in_app: embedded,
      plan: selectedPlan,
      has_draft: Boolean(kept),
    });
    // The quiet check (lib/auth/human-pass.ts): earned in the background while
    // they fill in the form, so nobody waits and nobody sees a puzzle.
    warmHumanPass();

    // Left without an account: the last thing she did and how long she stayed.
    // visibilitychange covers a phone switching apps (pagehide often never
    // fires there); pagehide covers closing the tab or going back. Sent once.
    const leave = () => {
      if (done.current || leftSent.current) return;
      leftSent.current = true;
      trackEvent("signup_left", { last: last.current, seconds: seconds() });
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") leave();
    };
    // Back to this page with the browser's back button (from Google, checkout
    // or the app): the page comes from the back-forward cache, frozen as it
    // was. Wake the button up and look again at whether she is signed in.
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      submitting.current = false;
      leftSent.current = false;
      setLoading(false);
      setSlow(false);
      setSignedIn(hasSignedInHint());
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onShow);
    };
    // initialPlan only seeds the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showError = (view: SignupErrorView, side: "client" | "server", status = 0) => {
    setError(view);
    last.current = "error_shown";
    trackEvent("signup_error", { code: view.code as SignupErrorCode, side, ...(view.field ? { field: view.field } : {}), status, plan });
    if (view.field) {
      const id = { name: "signup-name", email: "signup-email", password: "signup-password", access_code: "signup-access-code" }[view.field];
      window.setTimeout(() => document.getElementById(id)?.focus(), 0);
    }
  };

  const onFieldFocus = (event: React.FocusEvent<HTMLFormElement>) => {
    const field = (event.target as HTMLElement).dataset?.field as SignupField | undefined;
    if (!field) return;
    if (last.current === "untouched") last.current = "focused";
    if (focused.current.has(field)) return;
    focused.current.add(field);
    trackEvent("signup_field_focus", { field, seconds: seconds() });
  };

  const typed = () => {
    if (last.current === "untouched" || last.current === "focused") last.current = "typing";
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    // Read before any await: React clears currentTarget once the handler yields.
    const website = e.currentTarget.querySelector<HTMLInputElement>('input[name="website"]')?.value ?? "";

    // The browser's own checks, in plain words next to the box (the native
    // bubbles vary by browser and some in-app browsers never show them).
    const typo = suggestEmailFix(email);
    const linkMode = mode !== "password";
    const problem = checkSignupForm({
      name: linkMode ? name || "-" : name,
      email,
      password: linkMode ? "------" : password,
      typo,
      typoAccepted: typoCheckedFor.current === email.trim(),
    });
    if (problem) {
      if (problem.code === "email_typo") {
        setEmailSuggestion(typo);
        typoCheckedFor.current = email.trim();
      }
      showError(problem, "client");
      return;
    }

    if (linkMode) {
      void sendLink(website);
      return;
    }

    submitting.current = true;
    trackEvent("signup_submitted", { plan, seconds: seconds() });
    last.current = "submitting";
    setLoading(true); setError(null); setSlow(false);
    const slowTimer = window.setTimeout(() => setSlow(true), 8000);
    const finish = () => {
      window.clearTimeout(slowTimer);
      submitting.current = false;
      setLoading(false);
      setSlow(false);
    };
    try {
      const send = async () => {
        const human = await withTimeout(takeHumanPass(), PASS_WAIT_MS);
        if (human === "timeout" || !human) {
          trackEvent("signup_bot_check_failed", { code: human === "timeout" ? "timeout" : "no_pass" });
        }
        const controller = new AbortController();
        const abort = window.setTimeout(() => controller.abort(), REQUEST_WAIT_MS);
        try {
          const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              name,
              email,
              password,
              plan,
              accessCode,
              referralCode,
              attribution: { ...getAttribution(), sessionId: getSessionId() },
              ...(human && human !== "timeout" ? human : {}),
              website,
            }),
          });
          return { res: response, data: await response.json().catch(() => ({})) };
        } finally {
          window.clearTimeout(abort);
        }
      };
      let { res, data } = await send();
      // A pass can go stale (a laptop asleep on the signup page); a real person
      // never sees that: earn a fresh one quietly and try once more.
      if (!res.ok && (data.code === "human_check_failed" || data.code === "human_check_reused")) ({ res, data } = await send());
      if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : "unknown";
        if (code === "human_check_failed" || code === "human_check_reused" || code === "bot_check") {
          trackEvent("signup_bot_check_failed", { code });
        }
        // A reason code and status only: never the email or the password.
        showError(signupErrorView(code, typeof data.error === "string" ? data.error : ""), "server", res.status);
        finish();
        warmHumanPass(); // ready for their next try
        return;
      }
      done.current = true;
      track("signup_completed", { plan, method: "email" });
      // Tell Google Ads (if this visit came from an ad) before the page changes.
      await reportSignupConversion();

      if (plan !== "free") {
        // The account exists now: whatever happens to checkout, Billing is the way on.
        const checkoutData = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, currency, sessionId: getSessionId() }),
        })
          .then(async (r) => (r.ok ? await r.json().catch(() => ({})) : {}))
          .catch(() => ({}));
        if (typeof checkoutData.url !== "string" || !checkoutData.url) {
          setError(signupErrorView("checkout_failed", ""));
          finish();
          return;
        }
        window.location.replace(checkoutData.url);
        return;
      }

      // Land new free educators straight in the guided first-story flow. A
      // reader who came from a statement guide goes to /statement.
      window.location.replace(destination);
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      showError(signupErrorView(timedOut ? "timeout" : "network", ""), "server", 0);
      finish();
      warmHumanPass();
    }
  };

  // "Email me a link": the same checks on the server as a password signup
  // (app/api/auth/signup-link), then one tap in the email makes the account.
  const sendLink = async (website: string) => {
    submitting.current = true;
    setLoading(true); setError(null);
    rememberOAuthContext({ intent: "signup", next: destination, plan, currency, referralCode: referralCode || null, accessCode: accessCode || null });
    try {
      const human = await withTimeout(takeHumanPass(), PASS_WAIT_MS);
      if (human === "timeout" || !human) trackEvent("signup_bot_check_failed", { code: human === "timeout" ? "timeout" : "no_pass" });
      const res = await fetch("/api/auth/signup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, plan, next: destination, website, ...(human && human !== "timeout" ? human : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : "unknown";
        if (code === "human_check_failed" || code === "human_check_reused" || code === "bot_check") trackEvent("signup_bot_check_failed", { code });
        const view = signupErrorView(code, typeof data.error === "string" ? data.error : "");
        showError(code === "rate_limited" && typeof data.error === "string" ? { ...view, message: data.error } : view, "server", res.status);
        warmHumanPass();
        return;
      }
      trackEvent("signup_email_link_requested", { plan, has_draft: Boolean(keptWaiting) });
      last.current = "link_requested";
      setMode("link_sent");
      warmHumanPass();
    } catch {
      showError(signupErrorView("network", ""), "server", 0);
      warmHumanPass();
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // A breached or short password used to be a dead end on a phone. One tap
  // fills a strong, readable one and shows it, so it can be written down or
  // saved by the browser.
  const useSuggestedPassword = () => {
    setPassword(suggestPassphrase());
    setShowPassword(true);
    setSuggested(true);
    setError(null);
    track("cta_click", { name: "signup_suggest_password" });
  };

  const choosePlan = (next: PlanKey) => {
    setPlan(next);
    if (error?.code === "checkout_failed") return;
    setError(null);
  };

  const answerNotNow = (reason: (typeof SIGNUP_NOT_NOW_REASONS)[number]["key"]) => {
    trackEvent("exit_question_answered", { page: "/signup", reason });
    setNotNow("answered");
  };

  const selectedPlan = getPlanByKey(plan);
  const isPaidPlan = plan !== "free";
  // Centres start free with no card: until 31 January before 1 Jan 2027, 30 days after (lib/centre-offer.ts).
  const isCentre = plan === "centre_starter" || plan === "centre_growth";
  const paidIsCentre = paidOption === "centre_starter" || paidOption === "centre_growth";
  const paidPlan = getPlanByKey(paidOption);
  const paidPrice = `$${paidPlan.price[currency]} ${currency} a month`;
  const individualOffer = !paidIsCentre ? educatorOffer(currency, paidOption === "educator_pro" ? "educator_pro" : "educator") : null;
  const fieldError = (field: SignupField) => (error?.field === field ? error : null);
  const loginHref = destination === FIRST_STORY_PATH ? "/login" : `/login?redirect=${encodeURIComponent(destination)}`;

  const googleButton = (placement: "top" | "after") => (
    <GoogleButton
      intent="signup"
      next={destination}
      plan={plan}
      currency={currency}
      referralCode={referralCode || null}
      accessCode={accessCode || null}
      placement={placement}
      onStart={() => { last.current = "google_started"; }}
    />
  );

  const errorLine = (view: SignupErrorView | null, id: string) =>
    view ? (
      <p id={id} role="alert" className="mt-1.5 text-xs leading-relaxed text-red-700">{view.message}</p>
    ) : null;

  return (
    <div className="relative flex min-h-screen items-start justify-center bg-paper px-4 py-3 paper-texture sm:items-center sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-warm-mesh" />
      <div className="relative z-10 w-full max-w-md">
        <div className="card p-5 sm:p-8">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
            <Link href="/" className="flex items-center gap-2" aria-label="StoryLoop home">
              <Image src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display text-lg font-bold text-ink-900">StoryLoop</span>
            </Link>
            {/* Returning educators tap "Start free" too: the way in sits on the first line. */}
            <p className="text-xs text-ink-600">
              Have an account?{" "}
              <Link href={loginHref} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_top_sign_in">
                Sign in
              </Link>
            </p>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900">
            {isPaidPlan ? `Start ${selectedPlan.name}` : "Start free"}
          </h1>
          <p className="mb-3 text-sm text-ink-500 sm:mb-4">
            {isCentre
              ? "Then confirm the centre plan. No card needed."
              : isPaidPlan
                ? "Then your trial starts on secure checkout."
                : destination === "/statement"
                  ? "Free, no card needed. Next, your notes for the first child."
                  : "3 stories a month, free. No card needed."}
          </p>
          {cookiesOff && (
            <p role="status" className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800" data-testid="signup-cookies-off">
              Your browser is blocking cookies, and StoryLoop needs them to keep you signed in. Turn cookies on for this site, or open it in another browser.
            </p>
          )}
          {notice && (
            <p role="status" className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</p>
          )}
          {keptWaiting && (
            <p role="status" className="mb-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-ink-800" data-testid="kept-story-waiting">
              {keptWaiting === "story"
                ? "Your story is waiting. Create your account and it goes straight into your stories, free."
                : `Your ${keptWaiting} draft is waiting. Create your account and it opens straight away, ready to copy.`}
            </p>
          )}
          {signedIn && (
            <p role="status" className="mb-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-ink-800">
              You&apos;re already signed in on this device.{" "}
              <Link href="/dashboard" className="font-semibold text-clay-700 underline underline-offset-2" data-track="signup_open_app">
                Open StoryLoop
              </Link>
            </p>
          )}

          {/* One tap, no password to invent (shown once Google is switched on in Supabase).
              Inside Facebook's or Instagram's browser Google refuses, so email leads and Google waits below. */}
          {!inApp && googleButton("top")}
          {SIGNUP_EMAIL_LINK_ON && mode === "password" && (
            <p className="-mt-2 mb-3 text-center text-xs text-ink-600">
              <button type="button" onClick={() => { setMode("link"); setError(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2" data-track="signup_link_mode" data-testid="signup-link-mode">
                No password: email me a link
              </button>
            </p>
          )}
          {mode === "link_sent" && (
            <div role="status" className="mb-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-3 text-sm text-ink-800" data-testid="signup-link-sent">
              <p className="font-semibold text-ink-900">Check your email</p>
              <p className="mt-1">
                We sent a link to <span className="font-semibold">{email.trim()}</span>. Tap it and you&apos;re in. It works once, for the next hour.
                {keptWaiting ? " Open it on this device to keep your draft." : ""}
              </p>
              <p className="mt-2 text-xs text-ink-600">
                Not there? Check spam, or{" "}
                <button type="button" onClick={() => setMode("link")} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
                  send it again
                </button>
                .
              </p>
            </div>
          )}

          <form onSubmit={handleSignup} onFocusCapture={onFieldFocus} noValidate className={`relative space-y-3 ${mode === "link_sent" ? "hidden" : ""}`}>
            {/* The quiet check's trap (lib/auth/human-pass.ts): invisible, skipped by the
                keyboard and hidden from screen readers, so only a bot fills it. */}
            <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
              <label htmlFor="signup-website">Website</label>
              <input id="signup-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            <div>
              <label htmlFor="signup-name" className="label">Your name</label>
              <input id="signup-name" data-field="name" value={name} onChange={e => { setName(e.target.value); typed(); if (error?.field === "name") setError(null); }} autoComplete="name" className="input" placeholder="Jane Smith" aria-invalid={Boolean(fieldError("name"))} aria-describedby={fieldError("name") ? "signup-name-error" : undefined} />
              {errorLine(fieldError("name"), "signup-name-error")}
            </div>
            <div>
              <label htmlFor="signup-email" className="label">Email</label>
              <input id="signup-email" data-field="email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => { setEmail(e.target.value); setEmailSuggestion(null); typed(); if (error?.field === "email") setError(null); }} onBlur={() => setEmailSuggestion(suggestEmailFix(email))} autoComplete="email" className="input" placeholder={currency === "NZD" ? "you@centre.co.nz" : "you@centre.com.au"} aria-invalid={Boolean(fieldError("email"))} aria-describedby={fieldError("email") ? "signup-email-error" : undefined} />
              {/* "Did you mean …@gmail.com?" A mistyped domain loses the account's emails and sign-in links. */}
              {emailSuggestion ? (
                <p role="status" className="mt-1.5 text-sm text-ink-700" data-testid="signup-email-typo">
                  Did you mean <span className="font-semibold text-ink-900">{emailSuggestion}</span>?{" "}
                  <button type="button" onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(null); setError(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_email_fix">
                    Yes, use that
                  </button>
                  {error?.code === "email_typo" && (
                    <>
                      {" "}or{" "}
                      <button type="button" onClick={() => { typoCheckedFor.current = email.trim(); setEmailSuggestion(null); setError(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_email_keep">
                        mine is right
                      </button>
                    </>
                  )}
                </p>
              ) : (
                errorLine(fieldError("email"), "signup-email-error")
              )}
            </div>
            <div className={mode === "password" ? "" : "hidden"}>
              <label htmlFor="signup-password" className="label">Password</label>
              <div className="relative">
                <input id="signup-password" data-field="password" type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); typed(); if (error?.field === "password") setError(null); }} autoComplete="new-password" className="input pr-11" placeholder="At least 6 characters" aria-invalid={Boolean(fieldError("password"))} aria-describedby={fieldError("password") ? "signup-password-error" : undefined} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-500 hover:text-ink-900" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* A generated password cannot be saved inside the Facebook or
                  Instagram in-app browser, so say it plainly. */}
              {suggested && !error && (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-600">Write this down or save it now. You will need it to sign in on another device.</p>
              )}
              {fieldError("password") && (
                <div id="signup-password-error" role="alert" className="mt-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <p>{error?.message}</p>
                  <button type="button" onClick={useSuggestedPassword} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-clay-800 underline decoration-clay-300 underline-offset-2">
                    <Wand2 className="h-3.5 w-3.5" /> Make me a strong password
                  </button>
                </div>
              )}
            </div>
            {!isPaidPlan && (showAccessCode || accessCode) && (
              <div>
                <label htmlFor="signup-access-code" className="label">Access code</label>
                <input
                  id="signup-access-code"
                  data-field="access_code"
                  value={accessCode}
                  onChange={e => { setAccessCode(e.target.value); if (error?.field === "access_code") setError(null); }}
                  autoComplete="off"
                  autoFocus={showAccessCode && !accessCode}
                  className="input"
                  placeholder="Enter your code"
                />
                {fieldError("access_code") && (
                  <p id="signup-access-code-error" role="alert" className="mt-1.5 text-xs leading-relaxed text-red-700">
                    {error?.message}{" "}
                    <button type="button" onClick={() => { setAccessCode(""); setShowAccessCode(false); setError(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
                      Sign up without a code
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* The plan: compact, Free first. Paid plans picked here are how most
                payers start, so the choice stays, in one row. */}
            <div>
              <div role="radiogroup" aria-label="Your plan" className="grid grid-cols-2 gap-1 rounded-xl border border-clay-200 bg-cream-50 p-1">
                {(["free", paidOption] as PlanKey[]).map((option) => {
                  const on = plan === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-field="plan"
                      onClick={() => choosePlan(option)}
                      className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition-colors ${on ? "bg-white text-ink-900 shadow-sm ring-1 ring-clay-300" : "text-ink-600 hover:text-ink-900"}`}
                      data-track={option === "free" ? "signup_switch_free" : "signup_switch_paid"}
                    >
                      {option === "free" ? "Free" : getPlanByKey(option).name}
                    </button>
                  );
                })}
              </div>
              {isPaidPlan && (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink-600" data-testid="signup-plan-terms">
                  <span>
                    {paidIsCentre
                      ? <><CentreTrialWords capital />, then {paidPrice}.</>
                      : individualOffer?.offerLine}
                  </span>
                  <span className="inline-flex rounded-lg border border-clay-200 bg-white p-0.5" role="group" aria-label="Currency">
                    {(["AUD", "NZD"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        data-field="currency"
                        onClick={() => setCurrency(option)}
                        aria-pressed={currency === option}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${currency === option ? "bg-clay-700 text-paper" : "text-ink-600"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* An email that already has an account: show the way in, not a dead end. */}
            {error?.code === "email_exists" && (
              <div role="alert" className="rounded-lg border border-clay-200 bg-cream-50 px-3 py-2.5 text-xs leading-relaxed text-ink-700" data-testid="signup-exists">
                <p className="font-semibold text-ink-900">You already have a StoryLoop account with this email.</p>
                <p className="mt-1">
                  <Link href={loginHref} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_exists_sign_in">
                    Sign in
                  </Link>{" "}
                  with your password{googleOn ? ", or use Continue with Google with the same email" : ""}. Forgot it?{" "}
                  <Link href="/forgot-password" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                    Reset your password
                  </Link>
                  {" "}or{" "}
                  <Link href="/login?email_link=1" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_exists_email_link">
                    email me a sign-in link
                  </Link>
                  .
                </p>
              </div>
            )}
            {error && !error.field && error.code !== "email_exists" && (
              <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700" data-testid="signup-error">
                <p>{error.message}</p>
                {error.action === "refresh" && (
                  <button type="button" onClick={() => window.location.reload()} className="mt-1.5 font-semibold text-clay-800 underline decoration-clay-300 underline-offset-2">
                    Refresh the page
                  </button>
                )}
                {error.action === "sign_in" && (
                  <Link href={loginHref} className="mt-1.5 inline-block font-semibold text-clay-800 underline decoration-clay-300 underline-offset-2">
                    Sign in
                  </Link>
                )}
                {error.action === "billing" && (
                  <Link href="/billing" className="mt-1.5 inline-block font-semibold text-clay-800 underline decoration-clay-300 underline-offset-2">
                    Open Billing
                  </Link>
                )}
              </div>
            )}
            <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full py-3">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="sr-only">Creating your account</span></> : mode === "link" ? "Email me a link" : isCentre ? "Create account and start free month" : isPaidPlan ? "Create account and start trial" : "Create free account"}
            </button>
            {mode === "link" && (
              <p className="text-center text-xs text-ink-600">
                <button type="button" onClick={() => { setMode("password"); setError(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
                  Use a password instead
                </button>
              </p>
            )}
            {slow && loading && (
              <p role="status" className="text-center text-xs text-ink-500">Still working. Your connection is slow, so this can take a little longer.</p>
            )}
            <p className="text-center text-xs text-ink-500">
              By signing up you agree to our <Link href="/terms" className="text-clay-700 underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="text-clay-700 underline underline-offset-2">Privacy Policy</Link>.
              {!isPaidPlan && !showAccessCode && !accessCode && (
                <>
                  {" "}
                  <button type="button" onClick={() => setShowAccessCode(true)} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                    Have an access code?
                  </button>
                </>
              )}
            </p>
          </form>

          {inApp && googleButton("after")}

          {/* Why she is not signing up: one tap, fixed answers, nothing typed. */}
          <div className="mt-4 border-t border-clay-100 pt-3 text-center" data-testid="signup-not-now">
            {notNow === "closed" && (
              <button
                type="button"
                onClick={() => { setNotNow("open"); trackEvent("exit_question_shown", { page: "/signup" }); }}
                className="text-xs text-ink-500 underline decoration-clay-200 underline-offset-2 hover:text-ink-800"
              >
                Not now?
              </button>
            )}
            {notNow === "open" && (
              <div>
                <p className="text-xs font-semibold text-ink-700">What&apos;s stopping you? One tap is plenty.</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {SIGNUP_NOT_NOW_REASONS.map((reason) => (
                    <button
                      key={reason.key}
                      type="button"
                      onClick={() => answerNotNow(reason.key)}
                      className="min-h-9 rounded-full border border-clay-200 bg-white px-3 text-xs font-medium text-ink-700 hover:border-clay-400"
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {notNow === "answered" && (
              <p role="status" className="text-xs text-ink-600">
                Thank you, that helps.{" "}
                <Link href="/" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">Back to home</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
