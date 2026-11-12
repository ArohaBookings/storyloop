"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import StoryText from "@/components/app/StoryText";
import { track } from "@/lib/analytics/client";
import { CHECK_COMMENT_MAX, CHECK_DAYS, CHECK_NAME_MAX, leaderCountsSentence, OFFER_STORAGE_KEY, offerSignupHref, offerStorageValue, tokenFromHash, type LeaderView } from "@/lib/story-check";
import { useCentreTrialWords } from "@/components/centre/CentreTrialWords";


type Phase = "loading" | "ready" | "gone";

// The key never goes into analytics: every event from this page is filed under "/check".
const AT = { path: "/check" };

function day(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The leader's side of a check. One story, the note it came from beside it,
 * and two answers. Under the answer, before and after it, the only thing asked
 * of the leader: the whole team's free month, with this educator already in it
 * (13 Nov 2026). The person reading this page is the one who decides for the
 * centre, and this is the one time they have seen StoryLoop working on their
 * own children.
 */
export default function LeaderCheckPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [view, setView] = useState<LeaderView | null>(null);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const freeFor = useCentreTrialWords();

  useEffect(() => {
    const key = tokenFromHash(window.location.hash);
    if (!key) { setPhase("gone"); return; }
    setToken(key);
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: key, action: "open" }),
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data.view) { setPhase("gone"); return; }
        setView(data.view as LeaderView);
        setPhase("ready");
        track("leader_check_opened", { answered: Boolean(data.view.decision) }, AT);
      } catch {
        if (!cancelled) setPhase("gone");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const answer = async (decision: "approved" | "changes") => {
    if (saving) return;
    if (decision === "changes" && !comment.trim()) { setError("Say what you would change, so they know what to fix."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "answer", decision, name, comment: decision === "changes" ? comment : "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.view) { setError(data.error ?? "That did not save. Try again."); return; }
      setView(data.view as LeaderView);
      track("leader_check_answered", { decision }, AT);
    } catch {
      setError("That did not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="wide-shell flex min-h-[40vh] items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-clay-600" />
        <span className="sr-only">Opening the story</span>
      </div>
    );
  }

  if (phase === "gone" || !view) {
    return (
      <div className="wide-shell">
        <div className="card mx-auto max-w-xl p-8 text-center" data-testid="leader-check-gone">
          <h1 className="font-display text-2xl font-bold text-ink-900">This link is not open any more</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">
            Links to check a story last {CHECK_DAYS} days and can be cancelled by the educator who sent them. Ask them to send you a new one.
          </p>
          <Link href="/for-centres" className="btn-secondary mt-6 inline-flex px-5 py-2.5 text-sm">What is StoryLoop?</Link>
        </div>
      </div>
    );
  }

  const answered = Boolean(view.decision);
  const child = view.childName || "this child";
  const offer = view.offer;

  return (
    <div className="wide-shell" data-testid="leader-check">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-wider text-clay-700">A story to check</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">
          {view.educator} asked you to check this learning story
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600 md:text-lg">
          It takes about two minutes and there is nothing to sign up for. First is exactly what {view.educator} wrote down.
          Then the story drafted from it{view.writtenOn ? `, on ${day(view.writtenOn)}` : ""}.
        </p>

        <div className="mt-8 grid min-w-0 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="check-note">
            <h2 id="check-note" className="text-xs font-bold uppercase tracking-wider text-ink-500">The educator&apos;s note</h2>
            {view.note ? (
              <p className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink-800" data-testid="leader-check-note">{view.note}</p>
            ) : (
              <p className="mt-3 text-sm text-ink-500">No note was saved with this story.</p>
            )}
            <div className="mt-5 rounded-2xl border border-sage-200 bg-sage-50 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-sage-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
                What to look for
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-700">
                <li>Anything {child} says in the story should be in the note, word for word.</li>
                <li>Nothing should happen in the story that the note does not show.</li>
                <li>The curriculum links should fit what {child} actually did.</li>
              </ul>
            </div>
          </section>

          <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="check-story">
            <h2 id="check-story" className="text-xs font-bold uppercase tracking-wider text-ink-500">The story</h2>
            <div className="mt-3 min-w-0" data-testid="leader-check-story">
              <StoryText text={view.story} />
            </div>
          </section>
        </div>

        <section className="card mt-5 p-5 sm:p-6" aria-live="polite">
          {answered ? (
            <div data-testid="leader-check-thanks">
              <p className="flex items-center gap-2 font-display text-xl font-bold text-sage-900">
                <CheckCircle2 className="h-5 w-5" />
                {view.decision === "approved" ? `Thank you. ${view.educator} can see that it looks good.` : `Thank you. ${view.educator} can see your suggestion.`}
              </p>
              {view.comment && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-cream-50 p-3 text-sm leading-relaxed text-ink-700">{view.comment}</p>}
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-ink-900">What do you think?</h2>
              <div className="mt-4 max-w-sm">
                <label htmlFor="leader-name" className="label">Your first name (so {view.educator} knows who checked it)</label>
                <input
                  id="leader-name"
                  value={name}
                  maxLength={CHECK_NAME_MAX}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  className="input"
                  placeholder="Optional"
                />
              </div>
              {suggesting && (
                <div className="mt-4">
                  <label htmlFor="leader-comment" className="label">What would you change?</label>
                  <textarea
                    id="leader-comment"
                    value={comment}
                    maxLength={CHECK_COMMENT_MAX}
                    onChange={(e) => { setComment(e.target.value); if (error) setError(""); }}
                    rows={4}
                    className="input resize-none text-sm leading-relaxed"
                    placeholder="For example: the second paragraph says more than the note shows."
                  />
                </div>
              )}
              {error && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800" role="alert">{error}</p>}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {suggesting ? (
                  <>
                    <button type="button" onClick={() => answer("changes")} disabled={saving} className="btn-primary px-6 py-3 text-base disabled:opacity-60" data-testid="leader-check-send-changes">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />} Send my suggestion
                    </button>
                    <button type="button" onClick={() => { setSuggesting(false); setError(""); }} disabled={saving} className="btn-secondary px-6 py-3 text-base">Back</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => answer("approved")} disabled={saving} className="btn-primary px-6 py-3 text-base disabled:opacity-60" data-testid="leader-check-approve">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Looks good
                    </button>
                    <button type="button" onClick={() => setSuggesting(true)} disabled={saving} className="btn-secondary px-6 py-3 text-base" data-testid="leader-check-suggest">
                      Suggest a change
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* No offer at all when the educator ended it or is already in a centre (lib/story-check-server.ts). */}
        {offer && (
        <section className={`mt-5 rounded-3xl border p-6 sm:p-8 ${answered ? "border-clay-300 bg-paper shadow-soft" : "border-clay-100 bg-paper/70"}`} data-testid="leader-check-centre">
          <h2 className="font-display text-2xl font-bold text-ink-900" data-testid="leader-offer-heading">{view.educator} already writes with StoryLoop.</h2>
          {offer.counts && (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-700" data-testid="leader-offer-counts">
              {leaderCountsSentence(view.educator, offer.counts)}
            </p>
          )}
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700" data-testid="leader-offer-terms">
            Start a free month for {view.centreName ? <strong className="font-semibold text-ink-900">{view.centreName}</strong> : "your whole team"}: up
            to 10 educators and any number of children, <strong className="font-semibold text-ink-900">{freeFor}</strong>, with no card
            needed. {view.educator} comes with you, and {view.educator}&apos;s drafts stay private unless {view.educator} chooses to share them.
          </p>
          <div className="mt-5">
            <a
              href={offerSignupHref(offer)}
              onClick={() => {
                // Kept on this device too, for a leader who signs up in this browser. Not the link key; opens nothing.
                try { if (offer.ref) window.localStorage.setItem(OFFER_STORAGE_KEY, offerStorageValue(offer.ref)); } catch { /* the link carries it as well */ }
                track("leader_check_centre_click", { answered, to: "signup", counts: Boolean(offer.counts), named: Boolean(view.centreName) }, AT);
              }}
              className="btn-primary w-full justify-center px-6 py-3 text-base sm:w-auto"
              data-testid="leader-check-centre-link"
              // Click analytics records a link's address; this one carries the offer reference, so only the name is kept.
              data-private=""
              data-track="leader_offer_start"
            >
              Start our free month <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <Link
            href="/data-sheet"
            onClick={() => track("leader_check_centre_click", { answered, to: "data-sheet" }, AT)}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-ink-600 underline decoration-clay-200 underline-offset-4 hover:text-ink-900"
            data-testid="leader-offer-data-sheet"
          >
            <FileText className="h-3.5 w-3.5 flex-none" /> For your owner, board or approved provider: the one-page data sheet
          </Link>
        </section>
        )}

        <p className="mt-5 text-xs leading-relaxed text-ink-500">
          This link opens this one story only, until {day(view.expiresAt)}. Please do not pass it on.
        </p>
      </div>
    </div>
  );
}
