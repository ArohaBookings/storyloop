"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Wand2 } from "lucide-react";
import { getPlanByKey, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { captureAttribution, getAttribution, getSessionId, track } from "@/lib/analytics/client";
import { suggestPassphrase } from "@/lib/passphrase";
import { hasSignedInHint } from "@/lib/auth/signed-in-hint";
import GoogleButton from "@/components/auth/GoogleButton";
import { googleSignInEnabled } from "@/lib/auth/oauth";
import { suggestEmailFix } from "@/lib/email-typo";
import { reportSignupConversion } from "@/lib/analytics/google-ads";
import { takeHumanPass, warmHumanPass } from "@/lib/auth/human-pass-client";

function normaliseCurrency(value: string | null): CurrencyCode {
  return value === "NZD" ? "NZD" : "AUD";
}

/**
 * The plan arrives from the server with the page, so a director who clicked
 * "Claim a founding spot" sees the centre wording from the first frame. It used
 * to be read after load, and the page briefly showed the free-plan copy first.
 */
export default function SignupForm({ initialPlan = null }: { initialPlan?: string | null }) {
  const [name, setName] = useState("");
  // Already signed in on this device: point them back into the app.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasSignedInHint()), []);
  const [email, setEmail] = useState("");
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  // Collapsed by default. An always-visible optional code box makes the 99% of
  // visitors without one wonder whether they are missing a deal, and on a phone
  // it pushed "Create free account" below the fold. It opens automatically when
  // a code arrives in the link, so nobody holding a real code loses the path.
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Which field the server refused, so the fix sits next to it.
  const [errorField, setErrorField] = useState<"password" | "exists" | null>(null);
  const [notice, setNotice] = useState("");
  const [googleOn, setGoogleOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [plan, setPlan] = useState<PlanKey>(() => normalizePlanKey(initialPlan));
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    googleSignInEnabled().then(setGoogleOn).catch(() => {});
    const oauth = params.get("oauth");
    if (oauth === "cancelled") setNotice("Google sign-in was cancelled. Try again, or sign up with your email.");
    if (oauth === "failed") setNotice("Google sign-in didn't finish. Try again, or sign up with your email.");
    const selectedPlan = normalizePlanKey(params.get("plan"));
    const selectedCurrency = params.get("currency");
    const code = params.get("code");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPlan(selectedPlan);
    setCurrency(selectedCurrency ? normaliseCurrency(selectedCurrency) : tz?.includes("Auckland") ? "NZD" : "AUD");
    if (code) {
      setAccessCode(code);
      setShowAccessCode(true);
    }
    // Referral links look like /signup?ref=ABC1234. Remembered in state so the
    // referrer still gets credit even if the visitor edits the form first.
    const ref = params.get("ref") ?? window.localStorage.getItem("storyloop_ref");
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
      try { window.localStorage.setItem("storyloop_ref", ref.trim().toUpperCase()); } catch {}
    }
    captureAttribution();
    track("signup_view");
    // The quiet check (lib/auth/human-pass.ts): earned in the background while
    // they fill in the form, so nobody waits and nobody sees a puzzle.
    warmHumanPass();
  }, []);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read before any await: React clears currentTarget once the handler yields.
    const website = e.currentTarget.querySelector<HTMLInputElement>('input[name="website"]')?.value ?? "";
    track("signup_submitted", { plan });
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setErrorField("password");
      track("signup_error", { code: "short_password", status: 0, plan });
      return;
    }
    setLoading(true); setError(""); setErrorField(null);
    try {
      const send = async () => {
        const human = await takeHumanPass();
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            plan,
            accessCode,
            referralCode,
            attribution: { ...getAttribution(), sessionId: getSessionId() },
            ...(human ?? {}),
            website,
          }),
        });
        return { res: response, data: await response.json().catch(() => ({})) };
      };
      let { res, data } = await send();
      // A pass can go stale (a laptop asleep on the signup page); a real person
      // never sees that: earn a fresh one quietly and try once more.
      if (!res.ok && (data.code === "human_check_failed" || data.code === "human_check_reused")) ({ res, data } = await send());
      if (!res.ok) {
        // A reason code and status only: never the email or the password.
        track("signup_error", { code: typeof data.code === "string" ? data.code : "unknown", status: res.status, plan });
        setError(data.error ?? "Your account wasn't created. Please try again.");
        setErrorField(data.field === "password" ? "password" : data.code === "email_exists" ? "exists" : null);
        setLoading(false);
        warmHumanPass(); // ready for their next try
        return;
      }
      track("signup_completed", { plan });
      // Tell Google Ads (if this visit came from an ad) before the page changes.
      await reportSignupConversion();

      if (plan !== "free") {
        const checkoutResponse = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, currency, sessionId: getSessionId() }),
        });
        const checkoutData = await checkoutResponse.json();

        if (!checkoutResponse.ok || !checkoutData.url) {
          setError(checkoutData.error ?? "Your account was created, but checkout could not start. Sign in and open Billing to continue.");
          setLoading(false);
          return;
        }

        window.location.replace(checkoutData.url);
        return;
      }

      // Land new free educators straight in the guided first-story flow, not the
      // dashboard — the fastest path to their first "aha" and the biggest lever
      // on activation.
      window.location.replace("/generate?welcome=1");
    } catch {
      track("signup_error", { code: "network", status: 0, plan });
      setError("We couldn't reach StoryLoop. Check your internet connection and try again.");
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
    setError("");
    setErrorField(null);
    track("cta_click", { name: "signup_suggest_password" });
  };

  const selectedPlan = getPlanByKey(plan);
  const isPaidPlan = plan !== "free";
  // Centres start with 30 days free and no card (lib/centre-offer.ts).
  const isCentre = plan === "centre_starter" || plan === "centre_growth";
  const selectedPrice = `$${selectedPlan.price[currency]}${selectedPlan.price[currency] > 0 ? ` ${currency}/month` : ""}`;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 relative paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <Image src="/logo.svg" alt="StoryLoop" width={36} height={36} className="h-9 w-9" />
            <div>
              <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
              <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">
            {isPaidPlan ? `Start ${selectedPlan.name}` : "Start free"}
          </h1>
          <p className="text-sm text-ink-500 mb-4">
            {isCentre
              ? "Create your account, then confirm your centre’s free month on Stripe. No card is needed for the first 30 days."
              : isPaidPlan
                ? "Create your account first, then you’ll go straight to secure Stripe checkout to start the 7-day trial."
                : "3 stories every month, free. No card needed. Next, you’ll turn a quick note into your first story."}
          </p>
          {notice && (
            <p role="status" className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</p>
          )}
          {signedIn && (
            <p role="status" className="mb-4 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-ink-800">
              You&apos;re already signed in on this device.{" "}
              <Link href="/dashboard" className="font-semibold text-clay-700 underline underline-offset-2" data-track="signup_open_app">
                Open StoryLoop
              </Link>
            </p>
          )}
          {/* Up here, not only under the card (19 Oct 2026): returning
              educators landed on the homepage, tapped "Start free" and met this
              form, with "Sign in" a screen further down on a phone. */}
          <p className="mb-5 text-sm text-ink-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_top_sign_in">
              Sign in
            </Link>
          </p>

          {/* The plan card is for paid and centre plans, where the price and
              trial matter. For the free plan it repeated the line above and
              pushed the form below a phone's first screen. */}
          {isPaidPlan && (
          <div className="mb-6 rounded-2xl border border-clay-200 bg-cream-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-clay-700">Selected plan</p>
                <p className="font-display text-xl font-bold text-ink-900">{selectedPlan.name}</p>
                <p className="text-xs text-ink-600 mt-1">{selectedPlan.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {selectedPlan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-ink-700">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-sage-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isPaidPlan && <p className="mt-3 text-xs text-clay-700">{selectedPlan.buyer}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-ink-900">{selectedPrice}</p>
                {isPaidPlan && <p className="text-xs text-clay-600">{isCentre ? "after 30 days free" : "after trial"}</p>}
              </div>
            </div>
            {isPaidPlan && (
              <div className="mt-3 inline-flex rounded-xl border border-clay-200 bg-white p-1">
                {(["AUD", "NZD"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCurrency(option)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      currency === option ? "bg-clay-700 text-paper" : "text-ink-600 hover:bg-cream-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* One tap, no password to invent (shown once Google is switched on in Supabase). */}
          <GoogleButton
            intent="signup"
            next="/generate?welcome=1"
            plan={plan}
            currency={currency}
            referralCode={referralCode || null}
            accessCode={accessCode || null}
          />
          <form onSubmit={handleSignup} className="relative space-y-4">
            {/* The quiet check's trap (lib/auth/human-pass.ts): invisible, skipped by the
                keyboard and hidden from screen readers, so only a bot fills it. */}
            <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
              <label htmlFor="signup-website">Website</label>
              <input id="signup-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            <div><label htmlFor="signup-name" className="label">Your name</label><input id="signup-name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="input" placeholder="Jane Smith" /></div>
            <div>
              <label htmlFor="signup-email" className="label">Email</label>
              <input id="signup-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailSuggestion(null); }} onBlur={() => setEmailSuggestion(suggestEmailFix(email))} required autoComplete="email" className="input" placeholder={currency === "NZD" ? "you@centre.co.nz" : "you@centre.com.au"} />
              {/* "Did you mean …@gmail.com?" A mistyped domain loses the account's emails and sign-in links. */}
              {emailSuggestion && (
                <p role="status" className="mt-2 text-sm text-ink-700">
                  Did you mean <span className="font-semibold text-ink-900">{emailSuggestion}</span>?{" "}
                  <button type="button" onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(null); }} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_email_fix">
                    Yes, use that
                  </button>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="signup-password" className="label">Password</label>
              <div className="relative">
                <input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); if (errorField === "password") { setError(""); setErrorField(null); } }} required autoComplete="new-password" className="input pr-11" placeholder="At least 6 characters" aria-invalid={errorField === "password"} aria-describedby={errorField === "password" ? "signup-password-error" : undefined} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-500 hover:text-ink-900" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* A generated password cannot be saved inside the Facebook or
                  Instagram in-app browser, so say it plainly. */}
              {suggested && !error && (
                <p className="mt-2 text-xs leading-relaxed text-ink-600">Write this down or save it now. You will need it to sign in on another device.</p>
              )}
              {errorField === "password" && error && (
                <div id="signup-password-error" className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <p>{error}</p>
                  <button type="button" onClick={useSuggestedPassword} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-clay-800 underline decoration-clay-300 underline-offset-2">
                    <Wand2 className="h-3.5 w-3.5" /> Make me a strong password
                  </button>
                </div>
              )}
            </div>
            {!isPaidPlan && (showAccessCode || accessCode ? (
              <div>
                <label htmlFor="signup-access-code" className="label">Access code</label>
                <input
                  id="signup-access-code"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  autoComplete="off"
                  autoFocus={showAccessCode && !accessCode}
                  className="input"
                  placeholder="Enter your code"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAccessCode(true)}
                className="text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
              >
                Have an access code?
              </button>
            ))}
            {/* An email that already has an account: show the way in, not a dead end. */}
            {error && errorField === "exists" && (
              <div role="alert" className="rounded-lg border border-clay-200 bg-cream-50 px-3 py-2.5 text-xs leading-relaxed text-ink-700">
                <p className="font-semibold text-ink-900">You already have a StoryLoop account with this email.</p>
                <p className="mt-1">
                  <Link href="/login" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="signup_exists_sign_in">
                    Sign in
                  </Link>{" "}
                  with your password{googleOn ? ", or use Continue with Google with the same email" : ""}. Forgot it?{" "}
                  <Link href="/forgot-password" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                    Reset your password
                  </Link>
                </p>
              </div>
            )}
            {error && errorField !== "password" && errorField !== "exists" && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCentre ? "Create account and start free month" : isPaidPlan ? "Create account and start trial" : "Create free account"}
            </button>
            <p className="text-xs text-ink-500 text-center">By signing up you agree to our <Link href="/terms" className="text-clay-700 underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="text-clay-700 underline underline-offset-2">Privacy Policy</Link></p>
          </form>
        </div>
        <p className="text-center text-sm text-ink-500 mt-5">Already have an account? <Link href="/login" className="text-clay-700 font-semibold hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
