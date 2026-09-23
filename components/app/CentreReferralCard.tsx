"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Copy, Loader2 } from "lucide-react";

type ReferralState = { code: string | null; shareUrl: string | null; bankedMonths?: number; planName?: string };

/**
 * Get your centre on board.
 *
 * An educator paying NZ$21 of their own money is the person best placed to put
 * StoryLoop in front of the one person who can buy it for everybody, and they
 * are already having that conversation for nothing.
 *
 * The hard part is NOT the link. It is that asking your manager to spend money
 * is socially expensive, and most people will not do it from a standing start.
 * So this hands over the message as well: something professional they can send
 * without composing it, that argues from the centre's problems rather than
 * from how much the educator likes the product.
 */
const MESSAGE = (shareUrl: string, founding: boolean) =>
  `Hi,

I have been using StoryLoop for my own learning stories and it has saved me a lot of evening writing. It does not replace what we use now, the drafts export straight into it.

There is a centre plan that covers every educator and unlimited children for one flat price, and a couple of things in it that are ours rather than mine:

- an evidence pack that pulls together what a review visit asks for from the stories we have already written, and flags the gaps first
- a one page brief for relievers, built from what the team has already recorded
- codes we can put beside wall displays so families can read the learning behind them at pickup

If you want to look, this page has the details. Centres get 30 days free with no card needed${founding ? ", and the first ten centres then pay half for three months" : ""}: ${shareUrl}

Happy to show you what I have been doing with it.`;

export default function CentreReferralCard({ months = 3 }: { months?: number }) {
  const [state, setState] = useState<ReferralState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  // Whether founding spots remain, so the message never promises one that has gone.
  const [founding, setFounding] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data && !data.error) setState(data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    fetch("/api/centre-offer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) setFounding(typeof data?.founding?.spotsLeft === "number" && data.founding.spotsLeft > 0); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // The centre link lands on the centre offer, not a bare signup form. The
  // code is remembered from there (lib/analytics/client.ts) until they sign up.
  const centreUrl = useMemo(() => {
    if (!state?.shareUrl || !state.code) return null;
    try {
      return `${new URL(state.shareUrl).origin}/for-centres?ref=${encodeURIComponent(state.code)}#founding`;
    } catch {
      return state.shareUrl;
    }
  }, [state?.shareUrl, state?.code]);
  const message = useMemo(() => (centreUrl ? MESSAGE(centreUrl, founding) : ""), [centreUrl, founding]);
  const banked = state?.bankedMonths ?? 0;
  const onFreePlan = (state?.planName ?? "free") === "free";

  const copy = async (what: "link" | "message", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked; everything here is visible to copy by hand */
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-5 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your centre link...
      </div>
    );
  }
  if (!state?.shareUrl || !centreUrl) return null;

  return (
    <section id="centre-referral" className="card scroll-mt-24 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-clay-700 text-paper">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="section-title mb-1">Get your centre on board</p>
          <h2 className="font-display text-xl font-bold text-ink-900">
            If your centre subscribes on your code, you get {months} months of your own plan, free.
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Your centre gets 30 days free with no card needed{founding ? ", and the first ten centres then pay half for three months" : ""}.
            If a centre plan starts on your link, {months} months of your own subscription are credited automatically,
            so there is nothing to claim and nothing to chase. On the free plan they are held for you and applied the
            moment you start a plan.
          </p>
        </div>
      </div>

      {/* Months already earned but not yet payable. This is the whole reason
          the reward is held rather than dropped: an educator who brought their
          centre aboard while on the free plan has three months banked, which is
          the best reason to start a plan that anybody could be given. */}
      {banked > 0 && (
        <div className="mb-4 rounded-2xl border border-sage-200 bg-sage-50 p-4">
          <p className="text-sm font-semibold text-sage-800">
            You have {banked} free {banked === 1 ? "month" : "months"} waiting.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sage-800">
            {onFreePlan
              ? "They apply to your own plan automatically the moment you start one. Nothing to claim and nothing expires."
              : "They will come off your next invoices automatically."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-clay-200 bg-cream-50 px-3 py-2.5 font-mono text-xs text-ink-700">
          {centreUrl}
        </code>
        <button type="button" onClick={() => copy("link", centreUrl)} className="btn-secondary shrink-0 px-4 py-2.5 text-xs">
          {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink-800 hover:text-ink-900">
          <span className="underline decoration-clay-300 underline-offset-4">Something to send your manager</span>
          <span className="ml-1.5 text-xs text-ink-500 group-open:hidden">(you do not have to write it)</span>
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          Asking for money is the awkward part, so here are the words. It argues from what the centre has to deal with,
          not from how much you like it. Change anything that does not sound like you.
        </p>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-clay-200 bg-cream-50 p-3 font-sans text-xs leading-relaxed text-ink-700">
{message}
        </pre>
        <button type="button" onClick={() => copy("message", message)} className="btn-primary mt-2 px-4 py-2.5 text-xs">
          {copied === "message" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "message" ? "Copied" : "Copy the message"}
        </button>
      </details>
    </section>
  );
}
