"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, Check, Copy, Gift, MessageCircleHeart, RefreshCw, ShieldCheck, Sparkles, Star, Sunrise, X } from "lucide-react";
import { WHATS_NEW_ITEMS, type WhatsNewItem } from "@/lib/whats-new";
import { PLAN_DEFINITIONS } from "@/lib/plans";

type State = {
  userId: string;
  showWhatsNew: boolean;
  showReferralIntro: boolean;
  code: string | null;
  shareUrl: string | null;
  earned: number;
  max: number;
  discountPercent: number;
};

const ICONS: Record<WhatsNewItem["icon"], typeof Sparkles> = {
  quill: Sparkles,
  shield: ShieldCheck,
  voice: Sparkles,
  guides: BookOpen,
  refresh: RefreshCw,
  today: Sunrise,
  family: MessageCircleHeart,
  centre: BarChart3,
  review: Star,
};

/**
 * Two-page welcome card, shown once. Page one is what changed, page two is the
 * referral offer. Closing at any point marks the whole thing seen, so it never
 * reappears; the referral offer lives permanently on the Support page after that.
 */
export default function WhatsNewModal() {
  const [state, setState] = useState<State | null>(null);
  const [page, setPage] = useState(0);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/whats-new")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || data.error) return;
        const dismissalKey = `storyloop-whats-new-dismissed:${data.userId}`;
        if (window.localStorage.getItem(dismissalKey)) {
          setClosed(true);
          void fetch("/api/whats-new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "dismiss" }),
            keepalive: true,
          }).catch(() => {});
          return;
        }
        setState(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const pages = state ? [state.showWhatsNew ? "updates" : null, state.showReferralIntro ? "referral" : null].filter(Boolean) as string[] : [];

  const dismiss = useCallback(() => {
    setClosed(true);
    if (state?.userId) {
      window.localStorage.setItem(`storyloop-whats-new-dismissed:${state.userId}`, "1");
    }
    void fetch("/api/whats-new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
      keepalive: true,
    }).catch(() => {});
  }, [state?.userId]);

  useEffect(() => {
    if (closed || !pages.length) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closed, dismiss, pages.length]);

  if (!state || closed || pages.length === 0) return null;

  const current = pages[Math.min(page, pages.length - 1)];
  const isLast = page >= pages.length - 1;

  const copy = async () => {
    if (!state.shareUrl) return;
    try {
      await navigator.clipboard.writeText(state.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* link is visible to copy by hand */ }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="What's new in StoryLoop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-clay-200 bg-paper shadow-warm">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-50 hover:text-ink-800"
        >
          <X className="h-4 w-4" />
        </button>

        {current === "updates" ? (
          <div className="min-h-0 overflow-y-auto px-5 pb-6 pt-10 sm:px-7">
            <h2 className="text-center font-display text-2xl font-bold text-ink-900">What&apos;s new in StoryLoop</h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-[13px] leading-relaxed text-ink-600">
              The complete educator workflow is below. This card is shown only once; closing it dismisses it permanently for your account.
            </p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {WHATS_NEW_ITEMS.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <div key={item.title} className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay-700 text-paper">
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 border-t border-clay-100 pt-6">
              <div className="mb-4">
                <p className="section-title mb-1">Everything available</p>
                <h3 className="font-display text-xl font-bold text-ink-900">Every feature, listed by plan.</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Higher plans include the features in the plans before them.
                </p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {PLAN_DEFINITIONS.map((plan) => (
                  <section key={plan.key} className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink-900">{plan.name}</p>
                      <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-clay-700">
                        {plan.stories}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-600">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-sage-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-7 pb-6 pt-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-700 text-paper shadow-soft">
              <Gift className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink-900">Give {state.discountPercent}% off, get a month free</h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ink-600">
              Share StoryLoop with another educator. They get{" "}
              <strong className="text-ink-800">{state.discountPercent}% off their first month</strong>. Once they
              subscribe, you get <strong className="text-ink-800">a whole month free</strong>, up to {state.max}.
            </p>

            {state.shareUrl && (
              <div className="mt-5 flex flex-col gap-2 text-left sm:flex-row">
                <code className="min-w-0 flex-1 truncate rounded-xl border border-clay-200 bg-cream-50 px-3 py-2.5 font-mono text-[11px] text-ink-700">
                  {state.shareUrl}
                </code>
                <button type="button" onClick={copy} className="btn-secondary shrink-0 px-3.5 py-2.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-sage-700" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            <p className="mt-3 text-[11px] text-ink-500">Your link always lives on the Support page.</p>
          </div>
        )}

        <div className="border-t border-clay-100 px-7 py-5">
          {pages.length > 1 && (
            <div className="mb-4 flex justify-center gap-1.5" aria-hidden="true">
              {pages.map((name, index) => (
                <span
                  key={name}
                  className={`h-1.5 rounded-full transition-all ${index === page ? "w-5 bg-clay-700" : "w-1.5 bg-clay-200"}`}
                />
              ))}
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => (isLast ? dismiss() : setPage((p) => p + 1))}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              {isLast ? "Continue" : "Next"}
            </button>
            {current === "updates" && (
              <Link href="/blog" onClick={dismiss} className="text-[11px] text-ink-500 hover:text-ink-800">
                Read the educator guides
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
