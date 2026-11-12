"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Copy, Loader2 } from "lucide-react";
import { useCentreTrialWords } from "@/components/centre/CentreTrialWords";
import { CENTRE_MESSAGE } from "@/lib/centre-message";

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
/**
 * `embedded` (13 Nov 2026): inside the "Get your centre on board" card on the
 * Dashboard and My centre, which has its own heading and its own button, so
 * this drops its outer card and heading and keeps the code, the reward and the
 * message.
 */
export default function CentreReferralCard({ months = 3, embedded = false }: { months?: number; embedded?: boolean }) {
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
  const freeFor = useCentreTrialWords();
  const message = useMemo(() => (centreUrl ? CENTRE_MESSAGE(centreUrl, founding, freeFor) : ""), [centreUrl, founding, freeFor]);
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

  const reward = (
    <>
      Your centre can start {freeFor} with no card needed{founding ? ", and the first ten centres then pay half for three months" : ""}.
      If a centre plan starts on your link, {months} months of your own subscription are credited automatically,
      so there is nothing to claim and nothing to chase. On the free plan they are held for you and applied the
      moment you start a plan.
    </>
  );

  return (
    <section id={embedded ? "centre-referral-code" : "centre-referral"} className={embedded ? "min-w-0" : "card scroll-mt-24 p-5 md:p-6"} data-testid="centre-referral">
      {embedded ? (
        <div className="mb-3">
          <h3 className="text-sm font-bold text-ink-900">Or send your manager your centre link</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            If your centre subscribes on your code, you get {months} months of your own plan, free. {reward}
          </p>
        </div>
      ) : (
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
            {reward}
          </p>
        </div>
      </div>
      )}

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

      {/* py-3 makes the summary a 44px tap target; the margin above shrinks to match. */}
      <details className="group mt-1">
        <summary className="cursor-pointer list-none py-3 text-sm font-medium text-ink-800 hover:text-ink-900">
          <span className="underline decoration-clay-300 underline-offset-4">Something to send your manager</span>
          <span className="ml-1.5 text-xs text-ink-500 group-open:hidden">(you do not have to write it)</span>
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          Asking is the awkward part, so here are the words. Change anything that does not sound like you.
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
