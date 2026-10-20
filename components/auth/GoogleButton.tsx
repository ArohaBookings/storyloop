"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { googleSignInEnabled, isInAppBrowser, startGoogleSignIn, type OAuthIntent } from "@/lib/auth/oauth";

/** Google's "G" mark, as their branding guidelines ask (four colours, white ground). */
export function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={`${className} flex-none`}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * "Continue with Google" for /signup and /login. Renders nothing until Supabase
 * will really hand over to Google (googleSignInEnabled). In Facebook's or
 * Instagram's in-app browser, where Google refuses sign-in, it says how to use
 * it instead of failing.
 */
export default function GoogleButton({
  intent,
  next,
  plan,
  currency,
  referralCode,
  accessCode,
}: {
  intent: OAuthIntent;
  next: string;
  plan?: string | null;
  currency?: string | null;
  referralCode?: string | null;
  accessCode?: string | null;
}) {
  const [state, setState] = useState<"hidden" | "ready" | "in-app">("hidden");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    googleSignInEnabled().then((enabled) => {
      if (!live || !enabled) return;
      setState(isInAppBrowser(navigator.userAgent) ? "in-app" : "ready");
    });
    // Back from Google with the browser's back button: the page comes from the
    // back-forward cache with the button still saying "Opening Google…".
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      live = false;
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  if (state === "hidden") return null;

  if (state === "in-app") {
    return (
      <p className="mb-5 rounded-xl border border-clay-200 bg-cream-50 px-3 py-2.5 text-xs leading-relaxed text-ink-600">
        Want to use Google? Google sign-in doesn&apos;t work inside the Facebook or Instagram app. Tap the menu (•••) and open this page in
        your browser, or use your email below.
      </p>
    );
  }

  return (
    <div className="mb-5">
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError("");
          const failed = await startGoogleSignIn({ intent, next, plan, currency, referralCode, accessCode });
          if (failed) {
            setError(failed);
            setLoading(false);
          }
        }}
        className="group flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-clay-300 bg-white px-4 text-[15px] font-semibold text-ink-900 shadow-sm transition-all hover:-translate-y-px hover:border-clay-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600 active:translate-y-0 disabled:translate-y-0 disabled:opacity-70 disabled:shadow-sm"
        data-track={`google_${intent}`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-clay-600" /> : <GoogleMark />}
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-500">
          {intent === "login"
            ? "Signed up with your email before? Use the same Google email and you’ll land in that account."
            : "No password to remember. Google only shares your name and email with us."}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3 text-xs text-ink-400" aria-hidden="true">
        <span className="h-px flex-1 bg-clay-200" />
        or with your email
        <span className="h-px flex-1 bg-clay-200" />
      </div>
    </div>
  );
}
