"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Link2, Loader2 } from "lucide-react";
import { getAttribution, getSessionId, track } from "@/lib/analytics/client";
import { clearOAuthContext, readOAuthContext, type OAuthIntent } from "@/lib/auth/oauth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { GoogleMark } from "@/components/auth/GoogleButton";

/**
 * Where "Continue with Google" lands after Supabase has set the session
 * (/auth/callback → here). A new account is finished the same way an email
 * signup is (app/api/auth/oauth-complete), then it goes where an email signup
 * goes: checkout for a paid plan, the first-story screen for free. Someone
 * signing in goes back to where they were heading.
 *
 * Two moments get a word before moving on (20 Oct 2026):
 * - an account that signed up with email and password has just been joined
 *   to Google ("Google is now connected", so nobody wonders whether their
 *   stories are gone or whether they made a second account);
 * - from the sign-in page, a Google email with no account yet ("start a new
 *   account, or did you sign up with a different email?").
 */

type View =
  | { kind: "working" }
  | { kind: "linked"; email: string; target: string }
  | { kind: "confirm"; email: string }
  | { kind: "failed" };

const LINKED_PAUSE_MS = 5000;

function Finish() {
  const params = useSearchParams();
  const [view, setView] = useState<View>({ kind: "working" });
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);
  const contextRef = useRef(readOAuthContext());

  const context = contextRef.current;
  const intent: OAuthIntent = (params.get("intent") ?? context?.intent) === "login" ? "login" : "signup";
  const plan = context?.plan ?? "free";

  const complete = useCallback(
    async (confirm: boolean) => {
      const res = await fetch("/api/auth/oauth-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          confirm,
          plan,
          referralCode: context?.referralCode ?? null,
          accessCode: context?.accessCode ?? null,
          attribution: { ...getAttribution(), sessionId: getSessionId() },
        }),
      });
      if (res.status === 401) {
        // The Google step did not leave a session (cancelled, or blocked cookies).
        track("oauth_error", { provider: "google", stage: "no_session", intent });
        window.location.replace(`${intent === "signup" ? "/signup" : "/login"}?oauth=failed`);
        return;
      }
      if (!res.ok) throw new Error(`oauth-complete ${res.status}`);
      const data = await res.json();

      if (data.needsConfirm) {
        setView({ kind: "confirm", email: typeof data.email === "string" ? data.email : "" });
        return;
      }

      clearOAuthContext();
      if (data.isNew) {
        track("signup_completed", { plan, method: "google" });
        if (plan !== "free") {
          const checkout = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, currency: context?.currency ?? undefined, sessionId: getSessionId() }),
          });
          const checkoutData = await checkout.json().catch(() => ({}));
          window.location.replace(checkout.ok && checkoutData.url ? checkoutData.url : "/billing");
          return;
        }
        window.location.replace("/generate?welcome=1");
        return;
      }

      // An existing account. The signup page aims new people at the
      // first-story screen; someone who already has stories goes home
      // instead, or to Billing if they had picked a paid plan.
      let target = safeRedirectPath(params.get("next") ?? context?.next ?? null);
      if (target.startsWith("/generate?welcome")) target = "/dashboard";
      if (intent === "signup" && plan !== "free") target = "/billing";

      if (data.linked) {
        track("oauth_linked", { provider: "google", intent });
        setView({ kind: "linked", email: typeof data.email === "string" ? data.email : "", target });
        return;
      }
      track("oauth_signed_in", { provider: "google", intent });
      window.location.replace(target);
    },
    [context, intent, params, plan],
  );

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    complete(false).catch(() => setView({ kind: "failed" }));
  }, [complete]);

  // Linked: give them a moment to read it, then carry on.
  useEffect(() => {
    if (view.kind !== "linked") return;
    const timer = window.setTimeout(() => window.location.replace(view.target), LINKED_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [view]);

  const startNewAccount = async () => {
    setBusy(true);
    try {
      await complete(true);
    } catch {
      setView({ kind: "failed" });
    }
  };

  const useDifferentEmail = async () => {
    setBusy(true);
    track("oauth_new_declined", { provider: "google" });
    clearOAuthContext();
    await createClient().auth.signOut().catch(() => {});
    window.location.replace("/login?oauth=different");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10 paper-texture">
      <div className="pointer-events-none absolute inset-0 bg-warm-mesh" />
      <main className="relative z-10 w-full max-w-md">
        <div className="card p-8">
          {/* StoryLoop and Google, joined: the picture of what is happening. */}
          <div className="mb-7 flex items-center justify-center gap-3" aria-hidden="true">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-clay-200 bg-cream-50 shadow-sm">
              <Image src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
            </span>
            <span className="flex items-center gap-1.5">
              {view.kind === "working" ? (
                [0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay-400"
                    style={{ animationDelay: `${dot * 180}ms` }}
                  />
                ))
              ) : view.kind === "linked" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sage-600 text-white shadow-sm">
                  <Link2 className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="h-px w-8 bg-clay-300" />
              )}
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-clay-200 bg-white shadow-sm">
              <GoogleMark className="h-7 w-7" />
            </span>
          </div>

          {view.kind === "working" && (
            <div role="status" aria-live="polite">
              <h1 className="text-center font-display text-2xl font-bold text-ink-900">Signing you in</h1>
              <ol className="mx-auto mt-6 max-w-xs space-y-3 text-sm">
                <li className="flex items-center gap-3 text-ink-700">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sage-100 text-sage-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  Google confirmed it&apos;s you
                </li>
                <li className="flex items-center gap-3 font-semibold text-ink-900">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-clay-100 text-clay-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </span>
                  Opening your StoryLoop account
                </li>
              </ol>
            </div>
          )}

          {view.kind === "linked" && (
            <div role="status" aria-live="polite" className="text-center">
              <h1 className="font-display text-2xl font-bold text-ink-900">Google is now connected</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                You already had a StoryLoop account
                {view.email ? (
                  <>
                    {" "}with <span className="font-semibold text-ink-900">{view.email}</span>
                  </>
                ) : null}
                , so we signed you into it. Your stories and children are all there.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Next time, just tap <span className="font-semibold text-ink-900">Continue with Google</span>. Your password still works too.
              </p>
              <a href={view.target} className="btn-primary mt-6 w-full py-3" data-track="oauth_linked_continue">
                Open StoryLoop
              </a>
              <p className="mt-3 text-xs text-ink-400">Taking you there in a moment…</p>
            </div>
          )}

          {view.kind === "confirm" && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold text-ink-900">Start a new account?</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {view.email ? <span className="font-semibold text-ink-900">{view.email}</span> : "This Google email"} isn&apos;t on a
                StoryLoop account yet.
              </p>
              <div className="mt-6 space-y-3">
                <button type="button" onClick={startNewAccount} disabled={busy} className="btn-primary w-full py-3" data-track="oauth_confirm_new">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, start my free account"}
                </button>
                <button
                  type="button"
                  onClick={useDifferentEmail}
                  disabled={busy}
                  className="w-full rounded-xl border border-clay-300 bg-white px-4 py-3 text-sm font-semibold text-ink-800 transition-colors hover:border-clay-500 hover:bg-cream-50 disabled:opacity-60"
                  data-track="oauth_confirm_different"
                >
                  No, I signed up with a different email
                </button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-500">Free plan: 3 stories every month. No card needed.</p>
            </div>
          )}

          {view.kind === "failed" && (
            <div role="alert" className="text-center">
              <h1 className="font-display text-2xl font-bold text-ink-900">Almost there</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Google signed you in, but we couldn&apos;t finish opening your account. Your account is safe.
              </p>
              <div className="mt-6 space-y-3">
                <Link href="/dashboard" className="btn-primary w-full py-3">
                  Open StoryLoop
                </Link>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function FinishPage() {
  return (
    <Suspense fallback={null}>
      <Finish />
    </Suspense>
  );
}
