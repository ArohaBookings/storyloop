"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Loader2, Share2 } from "lucide-react";
import { getSessionId } from "@/lib/analytics/client";
import { trackEvent } from "@/lib/analytics/track-event";
import { WALL_STOP_CHOICES, rememberWall, type AppWall, type WallStopReason } from "@/lib/app-wall";
import { browserCurrency, educatorOffer, type EducatorOffer } from "@/lib/offer-wording";
import { useEducatorCheckoutLine } from "@/components/app/useEducatorCheckoutLine";
import SendToLeader from "@/components/app/SendToLeader";
import type { ClassPiece } from "@/lib/class-set";
import { STATEMENTS_PAY_TODAY } from "@/lib/build-switches";
import { statementTodayLine } from "@/lib/wall-offer";

/** What "Start my plan today" will charge a trialing account, from Stripe's preview (app/api/stripe/start-today). */
type StartToday = { eligible: true; line: string; currency: "NZD" | "AUD" } | { eligible: false; failed?: boolean };

/** This sitting's statements, if lane A's class set is there (lib/class-set.ts). Never throws. */
async function readClassSet(): Promise<ClassPiece[]> {
  try {
    const mod = (await import("@/lib/class-set")) as { listClassSet?: () => ClassPiece[] };
    return typeof mod.listClassSet === "function" ? mod.listClassSet() : [];
  } catch {
    return [];
  }
}

/**
 * The free-limit wall inside the app (lib/app-wall.ts explains why it looks
 * like this). Not a pop-up: it sits in the page, under her work, which stays
 * on screen. The price is the money checkout will really charge this account
 * (lib/wall-offer.ts: the early-educator half price, a referral's free month,
 * or the plain price), in her currency; the one button opens Stripe Checkout
 * and comes back to this page. Nothing here grants a plan.
 *
 * "My centre should pay" is an action when the wall sits under a story she
 * just wrote (leaderStoryId): one tap records the answer and makes the private
 * leader-check link for that story (the existing leader check,
 * /api/stories/[id]/check), ready to copy or share with her leader.
 *
 * The statement wall pays today (25 Nov 2026, STATEMENTS_PAY_TODAY): it reads
 * "Finish my class" and says exactly what is charged today. A trialing account
 * starts its plan in one tap (the card on file, app/api/stripe/start-today);
 * a free account goes to checkout with no free week. "Ask my centre to pay"
 * sits beside it and sends this sitting's statements to her leader.
 */
export default function AppLimitWall({
  wall,
  returnTo,
  heading,
  line,
  onBeforeCheckout,
  onDismiss,
  leaderStoryId,
}: {
  wall: AppWall;
  /** This page, from the list in checkoutReturnPath. */
  returnTo: string;
  heading: string;
  line: string;
  /** Keep her work for the trip to Stripe and back (lib/app-wall.ts keepWallWork). */
  onBeforeCheckout?: () => void;
  onDismiss?: () => void;
  /** The story she just wrote: "My centre should pay" sends it to her leader. */
  leaderStoryId?: string;
}) {
  const [offer, setOffer] = useState<EducatorOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<WallStopReason | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const { line: priceLine, discount, currency: lineCurrency } = useEducatorCheckoutLine();
  const [leaderUrl, setLeaderUrl] = useState("");
  const [leaderBusy, setLeaderBusy] = useState(false);
  const [leaderError, setLeaderError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const payToday = STATEMENTS_PAY_TODAY && wall === "statement";
  const [startToday, setStartToday] = useState<StartToday | null>(null);
  const [started, setStarted] = useState(false);
  const [startError, setStartError] = useState<{ text: string; billing: boolean } | null>(null);
  const [centrePieces, setCentrePieces] = useState<ClassPiece[] | null>(null);

  // The pay-today form: is this account in its free week? Stripe's own preview says what today costs.
  useEffect(() => {
    if (!payToday) return;
    let live = true;
    fetch("/api/stripe/start-today", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live) return;
        const ok = data?.eligible === true && typeof data.line === "string" && (data.currency === "NZD" || data.currency === "AUD");
        // "failed": her free week is on but Stripe's preview did not answer. Never checkout then
        // (that would be a second plan): Billing is the way on.
        setStartToday(ok ? { eligible: true, line: data.line, currency: data.currency } : { eligible: false, failed: data?.code === "failed" });
      })
      .catch(() => { if (live) setStartToday({ eligible: false, failed: true }); });
    return () => { live = false; };
  }, [payToday]);
  const trialing = startToday?.eligible === true;
  const previewFailed = startToday?.eligible === false && startToday.failed === true;
  const todayLine = !payToday || !startToday || previewFailed ? null : startToday.eligible ? startToday.line : discount ? statementTodayLine(lineCurrency, discount) : null;
  const payTodayShown = useRef(false);
  useEffect(() => {
    if (!payToday || !todayLine || payTodayShown.current) return;
    payTodayShown.current = true;
    trackEvent("statement_wall_pay_today", { trialing, currency: startToday?.eligible ? startToday.currency : lineCurrency });
  }, [payToday, todayLine, trialing, startToday, lineCurrency]);

  // The currency is only known in the browser. Shown once per wall.
  useEffect(() => {
    const currency = browserCurrency();
    const terms = educatorOffer(currency);
    setOffer(terms);
    const shownBefore = rememberWall(wall);
    trackEvent("wall_shown", { wall, plan: "educator", currency, price: terms.price, trial_days: STATEMENTS_PAY_TODAY && wall === "statement" ? 0 : terms.trialDays, shown_before: shownBefore });
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => card.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }), 60);
  }, [wall]);

  const startCheckout = async () => {
    if (!offer || busy) return;
    setBusy(true);
    setFailed(false);
    trackEvent("wall_checkout_tap", { wall, plan: "educator", currency: offer.currency });
    onBeforeCheckout?.();
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The early-educator discount the old wall's Billing link carried
        // (lib/activation-offer.ts): checkout applies it only to a free account.
        body: JSON.stringify({ plan: "educator", currency: offer.currency, activationOffer: true, returnTo, wall, sessionId: getSessionId() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") throw new Error("no checkout");
      window.location.assign(data.url);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  // A trialing account: the free week ends now and the first month is charged on the card on file.
  const startPlanToday = async () => {
    if (busy || started) return;
    setBusy(true);
    setStartError(null);
    trackEvent("wall_checkout_tap", { wall, plan: "educator", currency: startToday?.eligible ? startToday.currency : lineCurrency });
    try {
      const response = await fetch("/api/stripe/start-today", { method: "POST", keepalive: true });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) {
        setStarted(true);
        return;
      }
      if (data.needsAction && typeof data.hostedInvoiceUrl === "string") {
        window.location.assign(data.hostedInvoiceUrl);
        return;
      }
      setStartError({ text: typeof data.error === "string" ? data.error : "That did not go through. Nothing was charged.", billing: true });
    } catch {
      setStartError({ text: "No connection. Nothing was charged. Try again.", billing: false });
    } finally {
      setBusy(false);
    }
  };

  const askCentre = async () => {
    if (!reason) {
      setReason("centre_should_pay");
      trackEvent("wall_reason", { wall, reason: "centre_should_pay" });
    }
    setCentrePieces(await readClassSet());
  };

  const answer = (key: WallStopReason) => {
    if (reason) return;
    setReason(key);
    trackEvent("wall_reason", { wall, reason: key });
    if (key === "centre_should_pay" && leaderStoryId) void sendToLeader(leaderStoryId);
  };

  // The existing leader check: a private link to this one story, for her leader.
  const sendToLeader = async (storyId: string) => {
    setLeaderBusy(true);
    setLeaderError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centreName: "", shareCounts: false }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        setLeaderError(typeof data.error === "string" ? data.error : "The link could not be made. Try again from Send this story to your leader, under your story.");
        return;
      }
      setLeaderUrl(data.url);
      trackEvent("leader_check_sent", { centre_name: false, counts: false, story_id: storyId });
    } catch {
      setLeaderError("The link could not be made. Check your connection and try again.");
    } finally {
      setLeaderBusy(false);
    }
  };

  const copyLeaderLink = async () => {
    try {
      await navigator.clipboard.writeText(leaderUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLeaderError("Could not copy. Press and hold the link to copy it.");
    }
  };

  const shareLeaderLink = async () => {
    try {
      await navigator.share({ title: "A learning story from StoryLoop", text: "Could our centre pay for StoryLoop? Here is a story I wrote with it. It takes two minutes to read.", url: leaderUrl });
    } catch {
      /* closed the share sheet */
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const dismiss = () => {
    trackEvent("wall_dismissed", { wall });
    onDismiss?.();
  };

  if (payToday) {
    return (
      <div
        ref={card}
        role="region"
        aria-label="Free statements used"
        className="scroll-mt-24 rounded-3xl border border-clay-200 bg-white p-5 shadow-warm"
        data-testid={`wall-${wall}`}
        data-pay-today={trialing ? "trial" : "free"}
      >
        {started ? (
          <div role="status" aria-live="polite" data-testid="wall-started">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold leading-tight text-ink-900">
              <Check className="h-5 w-5 flex-none text-sage-700" /> Your plan has started.
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">Your notes are still here. Press Draft again, then keep going.</p>
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="btn-primary mt-3 w-full justify-center py-3 text-base" data-testid="wall-started-continue">
                Back to my notes <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold leading-tight text-ink-900">Finish my class</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600" data-testid="wall-line">
              {trialing
                ? "Your free week covers stories. More statements today need your plan. Your notes are still here."
                : "Free statements are 3 an hour and 9 a day. Educator covers as many as you need. Your notes are still here."}
            </p>
            <p className="mt-3 min-h-[1.5rem] text-base font-semibold text-ink-900" data-testid="wall-offer">
              {todayLine ? `Educator: ${todayLine}` : " "}
            </p>
            {previewFailed && (
              <p role="alert" className="mt-2 text-sm text-clay-700" data-testid="wall-preview-failed">
                The amount could not be checked just now. <Link href="/billing" className="font-semibold underline">Start your plan on Billing</Link>.
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={trialing ? startPlanToday : startCheckout}
                disabled={!todayLine || busy || (!trialing && !offer)}
                className="btn-primary w-full justify-center py-3 text-base"
                data-testid={trialing ? "wall-start-today" : "wall-checkout"}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Start my plan today
              </button>
              <button type="button" onClick={askCentre} className="btn-secondary w-full justify-center py-3 text-base" data-testid="wall-ask-centre">
                Ask my centre to pay
              </button>
            </div>
            {trialing && (
              <p className="mt-2 text-xs leading-relaxed text-ink-500">Your free week ends now and your card on file is charged today.</p>
            )}
            {startError && (
              <p role="alert" className="mt-2 text-center text-xs text-clay-700" data-testid="wall-start-error">
                {startError.text}
                {startError.billing && (
                  <>
                    {" "}
                    <Link href="/billing" className="font-semibold underline">Go to Billing</Link>.
                  </>
                )}
              </p>
            )}
            {failed && (
              <p role="alert" className="mt-2 text-center text-xs text-clay-700">
                Checkout did not open. Try again, or{" "}
                <Link href="/billing" className="font-semibold underline">go to Billing</Link>.
              </p>
            )}
            {centrePieces && (
              <div className="mt-4 border-t border-clay-100 pt-3" data-testid="wall-centre">
                {centrePieces.length > 0 ? (
                  <SendToLeader kind="set" pieces={centrePieces} />
                ) : (
                  <p className="flex items-start gap-1.5 text-sm text-sage-800" data-testid="wall-reason-thanks">
                    <Check className="mt-0.5 h-4 w-4 flex-none" /> Thanks. Draft a statement first, then send it to your leader from under it.
                  </p>
                )}
              </div>
            )}
            {!centrePieces && (
              <div className="mt-4 border-t border-clay-100 pt-3">
                {reason ? (
                  <p className="flex items-center gap-1.5 text-sm text-sage-800" data-testid="wall-reason-thanks">
                    <Check className="h-4 w-4" /> Thanks, that helps.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-ink-600">What is stopping you?</p>
                    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="What is stopping you?">
                      {WALL_STOP_CHOICES.filter((choice) => choice.key !== "centre_should_pay").map((choice) => (
                        <button
                          key={choice.key}
                          type="button"
                          onClick={() => answer(choice.key)}
                          className="min-h-[36px] rounded-full border border-clay-200 bg-cream-50 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-cream-100"
                          data-testid={`wall-reason-${choice.key}`}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {onDismiss && (
              <button type="button" onClick={dismiss} className="mt-3 min-h-[44px] text-xs font-semibold text-ink-500 underline decoration-clay-200 underline-offset-2 hover:text-ink-800" data-testid="wall-dismiss">
                Not now
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={card}
      role="region"
      aria-label="Free limit reached"
      className="scroll-mt-24 rounded-3xl border border-clay-200 bg-white p-5 shadow-warm"
      data-testid={`wall-${wall}`}
    >
      <h2 className="font-display text-xl font-bold leading-tight text-ink-900">{heading}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{line}</p>
      <p className="mt-3 min-h-[1.5rem] text-base font-semibold text-ink-900" data-testid="wall-offer">
        {priceLine ? `Educator: ${priceLine}` : " "}
      </p>
      <button
        type="button"
        onClick={startCheckout}
        disabled={!offer || !priceLine || busy}
        className="btn-primary mt-3 w-full justify-center py-3 text-base"
        data-testid="wall-checkout"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {offer && offer.trialDays > 0 ? `Start ${offer.trialDays} days free` : "Continue"}
        {!busy && <ArrowRight className="h-4 w-4" />}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-center text-xs text-clay-700">
          Checkout did not open. Try again, or{" "}
          <Link href="/billing" className="font-semibold underline">
            go to Billing
          </Link>
          .
        </p>
      )}

      <div className="mt-4 border-t border-clay-100 pt-3">
        {reason === "centre_should_pay" && leaderStoryId ? (
          <div data-testid="wall-leader">
            {leaderUrl ? (
              <>
                <p className="flex items-start gap-1.5 text-sm font-semibold text-sage-800" data-testid="wall-reason-thanks">
                  <Check className="mt-0.5 h-4 w-4 flex-none" /> Your leader&apos;s link is ready.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">
                  It opens the story you just wrote, with your note beside it. They need no account.
                </p>
                <input readOnly value={leaderUrl} onFocus={(e) => e.currentTarget.select()} className="input mt-2 font-mono text-xs" aria-label="Private link to this story for your leader" data-testid="wall-leader-link" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={copyLeaderLink} className="btn-secondary min-h-[44px] px-4 text-xs" data-testid="wall-leader-copy">
                    {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {linkCopied ? "Copied" : "Copy link"}
                  </button>
                  {canShare && (
                    <button type="button" onClick={shareLeaderLink} className="btn-secondary min-h-[44px] px-4 text-xs">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                  )}
                </div>
              </>
            ) : leaderBusy ? (
              <p className="flex items-center gap-1.5 text-sm text-ink-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Making a link for your leader…
              </p>
            ) : null}
            {leaderError && (
              <p role="alert" className="mt-2 text-xs text-clay-700">
                {leaderError}
              </p>
            )}
          </div>
        ) : reason ? (
          <p className="flex items-center gap-1.5 text-sm text-sage-800" data-testid="wall-reason-thanks">
            <Check className="h-4 w-4" /> Thanks, that helps.
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-ink-600">What is stopping you?</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="What is stopping you?">
              {WALL_STOP_CHOICES.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => answer(choice.key)}
                  className="min-h-[36px] rounded-full border border-clay-200 bg-cream-50 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-cream-100"
                  data-testid={`wall-reason-${choice.key}`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {onDismiss && (
        <button type="button" onClick={dismiss} className="mt-3 min-h-[44px] text-xs font-semibold text-ink-500 underline decoration-clay-200 underline-offset-2 hover:text-ink-800" data-testid="wall-dismiss">
          Not now
        </button>
      )}
    </div>
  );
}
