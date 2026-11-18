"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { shouldForward } from "@/lib/auth/forward-guard";
import SignInLinkForm from "@/components/auth/SignInLinkForm";
import GoogleButton from "@/components/auth/GoogleButton";
import { googleSignInEnabled } from "@/lib/auth/oauth";
import { signupPathFor } from "@/lib/signup-next";
import PageTracker from "@/components/analytics/PageTracker";

const DEFAULT_REDIRECT = "/dashboard";

/**
 * The sign-in form. `initialRedirect` is the page she was on her way to (read
 * on the server, app/(auth)/login/page.tsx). When that is a page of the app,
 * `offerSignup` puts "Create a free account" at the top, as big as Sign in,
 * and the account she makes there lands on that same page (lib/signup-next.ts).
 */
export default function LoginForm({ initialRedirect = null, offerSignup = false }: { initialRedirect?: string | null; offerSignup?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirect] = useState(() => (initialRedirect ? safeRedirectPath(initialRedirect) : DEFAULT_REDIRECT));
  const [notice, setNotice] = useState("");
  const [useLink, setUseLink] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [cookiesOff, setCookiesOff] = useState(false);
  const supabase = createClient();
  // The create-account link keeps the page she asked for.
  const signupHref = signupPathFor(initialRedirect);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("redirect");
    setCookiesOff(navigator.cookieEnabled === false);
    if (params.get("link") === "expired") {
      setNotice("That sign-in link has been used or has expired. Sign in below, or get a new link.");
      setUseLink(true);
    }
    // From signup's "you already have an account": open straight on the link option.
    if (params.get("email_link") === "1") setUseLink(true);
    const oauth = params.get("oauth");
    if (oauth === "failed") {
      setNotice("Google sign-in didn't finish. Try again, or sign in with your email.");
    } else if (oauth === "cancelled") {
      setNotice("Google sign-in was cancelled. Try again, or sign in with your email.");
    } else if (oauth === "different") {
      setNotice("No new account was set up. Sign in with the email you used for StoryLoop, or choose that Google account.");
    }
    googleSignInEnabled().then(setGoogleOn).catch(() => {});
    if (params.get("disabled") === "1") {
      setNotice("This account has been disabled. Contact support if you think this is a mistake.");
    }
    // A link that names where to go (an email's "claim your 15% off") should not
    // ask someone who is already signed in to sign in again. Only for an explicit
    // redirect and never with a notice to show, so a disabled account or an
    // expired link cannot bounce between pages.
    if (nextPath && !params.get("disabled") && !params.get("link")) {
      const target = safeRedirectPath(nextPath);
      supabase.auth.getUser().then(({ data }) => {
        let storage: Storage | null = null;
        try { storage = window.sessionStorage; } catch { storage = null; }
        if (data.user && shouldForward(target, storage)) window.location.replace(target);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase says "Invalid login credentials" for a wrong password and for
      // an account that only ever used Google. Say what to do about both.
      setError(
        /invalid login credentials/i.test(error.message)
          ? `That email and password don't match.${googleOn ? " If you signed up with Google, use Continue with Google above." : ""} Or reset your password below.${offerSignup ? " New here? Create a free account above." : ""}`
          : error.message,
      );
      setLoading(false);
      return;
    }

    try {
      const adminResponse = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (adminResponse.ok) {
        const nextPath = redirect === DEFAULT_REDIRECT ? "/admin" : redirect;
        window.location.replace(nextPath);
        return;
      }
    } catch {}

    window.location.replace(redirect);
  };

  return (
    <div className={`min-h-screen bg-paper flex justify-center px-4 paper-texture ${offerSignup ? "items-start py-3 sm:items-center sm:py-10" : "items-center"}`}>
      <PageTracker />
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        {!offerSignup && (
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        )}
        <div className={`card ${offerSignup ? "p-5 sm:p-8" : "p-8"}`}>
          {offerSignup ? (
            <>
              <Link href="/" className="mb-3 flex items-center gap-2 sm:mb-5" aria-label="StoryLoop home">
                <Image src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7" />
                <span className="font-display text-lg font-bold text-ink-900">StoryLoop</span>
              </Link>
              <h1 className="font-display text-2xl font-bold text-ink-900">Sign in, or start free</h1>
              <p className="mb-3 text-sm text-ink-500 sm:mb-4">
                New to StoryLoop? Make a free account and you&apos;ll go straight to the page you opened. No card needed.
              </p>
              {/* As big as Sign in, and first: a new educator sees her way in within a second. */}
              <Link
                href={signupHref}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-clay-600 bg-white px-4 text-[15px] font-semibold text-clay-800 shadow-sm transition-colors hover:bg-cream-50"
                data-track="login_create_free_account"
                data-testid="login-create-account"
              >
                Create a free account
              </Link>
              <div className="my-4 flex items-center gap-3 text-xs text-ink-500" aria-hidden="true">
                <span className="h-px flex-1 bg-clay-200" />
                Have an account? Sign in
                <span className="h-px flex-1 bg-clay-200" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-6">
                <Image src="/logo.svg" alt="StoryLoop" width={36} height={36} className="h-9 w-9" />
                <div>
                  <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
                  <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Welcome back</h1>
              <p className="text-sm text-ink-500 mb-6">Sign in to keep drafting, editing, and saving learning stories.</p>
            </>
          )}

          {cookiesOff && (
            <p role="status" className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800" data-testid="login-cookies-off">
              Your browser is blocking cookies, and StoryLoop needs them to keep you signed in. Turn cookies on for this site, or open it in another browser.
            </p>
          )}
          <GoogleButton intent="login" next={redirect} />
          <form onSubmit={handleLogin} className={offerSignup ? "space-y-3" : "space-y-4"}>
            {notice && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{notice}</div>}
            <div><label className="label" htmlFor="login-email">Email</label><input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" /></div>
            <div><label className="label" htmlFor="login-password">Password</label><input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="input" /></div>
            {error && <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
            <div className="flex items-center justify-between gap-3 text-xs">
              <Link href="/forgot-password" className="inline-flex min-h-[44px] items-center text-ink-500 hover:text-clay-700 hover:underline">Forgot your password?</Link>
              <button type="button" onClick={() => setUseLink((value) => !value)} className="inline-flex min-h-[44px] items-center text-right font-semibold text-clay-700 hover:underline">
                {useLink ? "Hide" : "Email me a sign-in link instead"}
              </button>
            </div>
          </form>
          {useLink && (
            <div className="mt-5 border-t border-clay-100 pt-5">
              <SignInLinkForm redirect={redirect} defaultEmail={email} compact />
            </div>
          )}
        </div>
        {!offerSignup && (
          <p className="text-center text-sm text-ink-500 mt-5">New here? <Link href={signupHref} className="text-clay-700 font-semibold hover:underline" data-track="login_new_here">Create an account</Link></p>
        )}
      </div>
    </div>
  );
}
