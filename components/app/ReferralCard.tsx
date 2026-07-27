"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Loader2, X } from "lucide-react";

type ReferralState = {
  code: string | null;
  shareUrl: string | null;
  earned: number;
  pending: number;
  max: number;
  remaining: number;
  discountPercent: number;
  showIntro: boolean;
  wasReferred: boolean;
};

/** Five small loops that fill in as free months are earned. */
function Progress({ earned, max }: { earned: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${earned} of ${max} free months earned`}>
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={`h-2 flex-1 rounded-full transition-colors ${
            index < earned ? "bg-sage-600" : "bg-clay-200"
          }`}
        />
      ))}
    </div>
  );
}

function ShareRow({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; the link is visible to copy manually */
    }
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <code className="min-w-0 flex-1 truncate rounded-xl border border-clay-200 bg-cream-50 px-3 py-2.5 font-mono text-xs text-ink-700">
        {shareUrl}
      </code>
      <button type="button" onClick={copy} className="btn-primary shrink-0 px-4 py-2.5 text-xs">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

/**
 * `variant="modal"` shows the one-time welcome overlay after sign-in.
 * `variant="inline"` is the permanent version that lives on the Support page.
 */
export default function ReferralCard({ variant = "inline" }: { variant?: "inline" | "modal" }) {
  const [state, setState] = useState<ReferralState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data && !data.error) setState(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    // Fire and forget: the modal is already gone from the user's point of view.
    void fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_intro" }),
    }).catch(() => {});
  };

  if (variant === "modal") {
    if (loading || !state || !state.showIntro || dismissed || !state.shareUrl) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 backdrop-blur-sm sm:items-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-clay-200 bg-paper shadow-warm">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-50 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="bg-gradient-to-br from-sage-50 via-cream-50 to-white px-6 pb-5 pt-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-700 text-paper shadow-soft">
              <Gift className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink-900">Give 10% off, get a month free</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-600">
              Share StoryLoop with another educator. They get{" "}
              <strong className="text-ink-800">{state.discountPercent}% off their first month</strong>, and once they
              subscribe you get <strong className="text-ink-800">a whole month free</strong>.
            </p>
          </div>

          <div className="space-y-4 px-6 pb-6 pt-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-ink-800">Free months earned</span>
                <span className="text-ink-500">{state.earned} of {state.max}</span>
              </div>
              <Progress earned={state.earned} max={state.max} />
            </div>
            <ShareRow shareUrl={state.shareUrl} />
            <button type="button" onClick={dismiss} className="w-full text-center text-xs text-ink-500 hover:text-ink-800">
              Maybe later
            </button>
            <p className="text-center text-[11px] text-ink-400">
              You can always find your link on the Support page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-5 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your referral link...
      </div>
    );
  }
  if (!state?.shareUrl) return null;

  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-700 text-paper">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <p className="section-title mb-1">Refer an educator</p>
          <h2 className="font-display text-xl font-bold text-ink-900">
            They get {state.discountPercent}% off. You get a month free.
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            Up to {state.max} free months. The credit lands on your account automatically once they subscribe, so
            there is nothing to claim.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-ink-800">Free months earned</span>
          <span className="text-ink-500">
            {state.earned} of {state.max}
            {state.pending > 0 && ` · ${state.pending} waiting to subscribe`}
          </span>
        </div>
        <Progress earned={state.earned} max={state.max} />
      </div>

      <ShareRow shareUrl={state.shareUrl} />

      {state.remaining === 0 && (
        <p className="mt-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs text-sage-800">
          You have earned all {state.max} free months. Thank you for spreading the word.
        </p>
      )}
    </section>
  );
}
