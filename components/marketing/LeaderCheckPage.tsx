"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Download, FileText, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import StoryText from "@/components/app/StoryText";
import { track } from "@/lib/analytics/client";
import { CHECK_COMMENT_MAX, CHECK_DAYS, CHECK_NAME_MAX, leaderCountsSentence, OFFER_STORAGE_KEY, offerSignupHref, offerStorageValue, tokenFromHash, type CoverView, type LeaderView } from "@/lib/story-check";
import { pieceKindLabel, type SetPieceView, type SetView } from "@/lib/leader-sets";
import { keptStrategyLabel } from "@/lib/keep-story";
import { setFileName, setText } from "@/lib/leader-set-export";
import { LEADER_EMAIL_ON } from "@/lib/build-switches";
import CentreTrialWords from "@/components/centre/CentreTrialWords";
import CentrePriceWords from "@/components/buyer/CentrePriceWords";

type Phase = "loading" | "cover" | "opening" | "ready" | "gone";
type PageView = LeaderView | SetView;

// The key never goes into analytics: every event from this page is filed under "/check".
const AT = { path: "/check" };

function day(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
}

/**
 * How the page runs (25 Nov 2026). With LEADER_EMAIL_ON the leader sees a
 * cover first and the story only after a tap, and the centre offer only after
 * she has answered. Off, it is the 10 to 24 Nov page: the story opens straight
 * away and the offer sits under it from the start. Pure, for the switch test.
 */
export function leaderPageOrder(on: boolean) {
  return { cover: on, offerAfterAnswer: on };
}

const ORDER = leaderPageOrder(LEADER_EMAIL_ON);

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data: data as { view?: PageView; cover?: CoverView; error?: string; answered?: number } };
}

/**
 * The leader's side of a check: one story, or a whole room's statements.
 *
 * 25 Nov 2026: the leader's two minutes on a phone. A cover first (who sent
 * it, one tap), so a link preview, a mail scanner or a mistyped address never
 * shows a child's story, and "opened" means a person tapped. Then the note and
 * the story, the answer first, and only after the answer the one thing asked
 * of her: start her centre free, with the educator already in the team when
 * she asked to be.
 *
 * `preview`: the educator's "See what your leader will see". The same page
 * from her own data, every button inert, nothing fetched.
 */
export default function LeaderCheckPage({ preview }: { preview?: PageView }) {
  const [phase, setPhase] = useState<Phase>(preview ? "ready" : "loading");
  const [cover, setCover] = useState<CoverView | null>(null);
  const [view, setView] = useState<PageView | null>(preview ?? null);
  const [token, setToken] = useState("");
  const [tapError, setTapError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null) as React.RefObject<HTMLHeadingElement>;

  useEffect(() => {
    if (preview) return;
    const key = tokenFromHash(window.location.hash);
    if (!key) { setPhase("gone"); return; }
    setToken(key);
    let cancelled = false;
    (async () => {
      try {
        if (ORDER.cover) {
          const { ok, data } = await post({ token: key, action: "cover" });
          if (cancelled) return;
          if (!ok || !data.cover) { setPhase("gone"); return; }
          setCover(data.cover);
          setPhase("cover");
          track("leader_check_opened", { answered: data.cover.state === "answered" }, AT);
          return;
        }
        const { ok, data } = await post({ token: key, action: "open" });
        if (cancelled) return;
        if (!ok || !data.view) { setPhase("gone"); return; }
        setView(data.view);
        setPhase("ready");
        track("leader_check_opened", { answered: data.view.kind === "story" ? Boolean(data.view.decision) : false }, AT);
      } catch {
        if (!cancelled) setPhase("gone");
      }
    })();
    return () => { cancelled = true; };
  }, [preview]);

  const openIt = async () => {
    if (phase === "opening") return;
    setPhase("opening"); setTapError("");
    try {
      const { ok, data } = await post({ token, action: "open" });
      if (!ok || !data.view) { setPhase("gone"); return; }
      setView(data.view);
      setPhase("ready");
      track("leader_check_cover_tap", { kind: data.view.kind }, AT);
      window.setTimeout(() => heading.current?.focus(), 30);
    } catch {
      setTapError("No connection. Try again.");
      setPhase("cover");
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

  if (phase === "gone" || (phase !== "cover" && phase !== "opening" && !view)) {
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

  if ((phase === "cover" || phase === "opening") && cover) {
    const what = cover.kind === "set" ? `${cover.pieces} ${cover.pieces === 1 ? "statement" : "statements"}` : "a learning story";
    return (
      <div className="wide-shell" data-testid="leader-check-cover">
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col">
          <p className="text-sm font-bold uppercase tracking-wider text-clay-700">
            From {cover.educator}{cover.centreName ? ` at ${cover.centreName}` : ""}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900">
            {cover.educator} asked you to check {what}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">About two minutes. Nothing to sign up for.</p>
          <button
            type="button"
            onClick={openIt}
            disabled={phase === "opening"}
            className="btn-primary mt-6 min-h-[48px] w-full justify-center px-6 py-3 text-base disabled:opacity-70"
            data-testid="leader-check-open"
          >
            {phase === "opening" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {cover.kind === "set" ? "Open the statements" : "Open the story"}
          </button>
          {tapError && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800" role="alert">{tapError}</p>}
          <p className="mt-3 text-sm text-ink-500">Only open this if you know {cover.educator}.</p>
          <p className="mt-auto pt-10 text-xs leading-relaxed text-ink-500">
            This link opens {cover.kind === "set" ? "these statements" : "this story"} only, until {day(cover.expiresAt)}. Please do not pass it on.
          </p>
        </div>
      </div>
    );
  }

  if (!view) return null;
  return view.kind === "set"
    ? <SetPage view={view} token={token} preview={Boolean(preview)} onView={setView} heading={heading} />
    : <StoryPage view={view} token={token} preview={Boolean(preview)} onView={setView} heading={heading} />;
}

type PageProps<V> = { view: V; token: string; preview: boolean; onView: (view: PageView) => void; heading: React.RefObject<HTMLHeadingElement> };

/** The note, clamped to six lines with Show all, so the story is never far below. */
function NoteCard({ educator, note, testId = "leader-check-note" }: { educator: string; note: string; testId?: string }) {
  const [all, setAll] = useState(false);
  const long = note.split("\n").length > 6 || note.length > 420;
  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-label={`What ${educator} wrote down`}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">What {educator} wrote down</h2>
      {note ? (
        <>
          <p className={`mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink-800 ${long && !all ? "line-clamp-6" : ""}`} data-testid={testId}>{note}</p>
          {long && !all && (
            <button type="button" onClick={() => setAll(true)} className="mt-1 min-h-[44px] text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">Show all</button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-500">No note was saved with this story.</p>
      )}
    </section>
  );
}

/** The start block: shown only after the answer (with the switch on). Pre-filled with her centre's name. */
function StartBlock({ view, answered, preview }: { view: PageView; answered: boolean; preview: boolean }) {
  const offer = view.offer;
  if (!offer) return null;
  const counts = view.kind === "story" ? view.offer?.counts ?? null : null;
  const centre = view.centreName;
  const remember = () => {
    try { if (offer.ref) window.localStorage.setItem(OFFER_STORAGE_KEY, offerStorageValue(offer.ref)); } catch { /* the link carries it as well */ }
    track("leader_check_centre_click", { answered, to: "signup", counts: Boolean(counts), named: Boolean(centre) }, AT);
  };
  if (!ORDER.offerAfterAnswer) {
    // The 10 to 24 Nov block, word for word.
    return (
      <section className={`mt-5 rounded-3xl border p-6 sm:p-8 ${answered ? "border-clay-300 bg-paper shadow-soft" : "border-clay-100 bg-paper/70"}`} data-testid="leader-check-centre">
        <h2 className="font-display text-2xl font-bold text-ink-900" data-testid="leader-offer-heading">{view.educator} already writes with StoryLoop.</h2>
        {counts && <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-700" data-testid="leader-offer-counts">{leaderCountsSentence(view.educator, counts)}</p>}
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700" data-testid="leader-offer-terms">
          Start {centre ? <strong className="font-semibold text-ink-900">{centre}</strong> : "your whole team"} on StoryLoop.{" "}
          <strong className="font-semibold text-ink-900"><CentreTrialWords capital />, no card.</strong>{" "}
          <CentrePriceWords />, unlimited children. {view.educator} comes with you, and {view.educator}&apos;s drafts stay private unless{" "}
          {view.educator} chooses to share them.
        </p>
        <div className="mt-5">
          <a href={offerSignupHref(offer)} onClick={remember} className="btn-primary w-full justify-center px-6 py-3 text-base sm:w-auto" data-testid="leader-check-centre-link" data-private="" data-track="leader_offer_start">
            Start your centre free <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <DataSheetLink answered={answered} />
      </section>
    );
  }
  return (
    <section className="mt-5 rounded-3xl border border-clay-300 bg-paper p-6 shadow-soft sm:p-8" data-testid="leader-check-centre">
      <h2 className="font-display text-2xl font-bold leading-tight text-ink-900" data-testid="leader-offer-heading">
        Start {centre || "your centre"} free
      </h2>
      {counts && <p className="mt-2 text-base leading-relaxed text-ink-700" data-testid="leader-offer-counts">{leaderCountsSentence(view.educator, counts)}</p>}
      <ul className="mt-3 space-y-1.5 text-base leading-relaxed text-ink-700" data-testid="leader-offer-terms">
        <li><strong className="font-semibold text-ink-900"><CentreTrialWords capital />.</strong> No card, no payment page.</li>
        <li data-testid="leader-offer-team">
          {view.joinConsent
            ? `${view.educator} is already in your team the moment you start.`
            : `${view.educator} is one tap away once you start.`}
        </li>
        <li>Drafts stay private unless each educator shares them.</li>
      </ul>
      <p className="mt-2 text-sm text-ink-500">After that, <CentrePriceWords />.</p>
      <a
        href={preview ? undefined : offerSignupHref(offer)}
        onClick={preview ? undefined : remember}
        aria-disabled={preview || undefined}
        className="btn-primary mt-5 min-h-[48px] w-full justify-center px-6 py-3 text-base"
        data-testid="leader-check-centre-link"
        // Click analytics records a link's address; this one carries the offer reference, so only the name is kept.
        data-private=""
        data-track="leader_offer_start"
      >
        Start {centre || "your centre"} free <ArrowRight className="h-4 w-4" />
      </a>
      <DataSheetLink answered={answered} />
    </section>
  );
}

function DataSheetLink({ answered }: { answered: boolean }) {
  return (
    <Link
      href="/data-sheet"
      onClick={() => track("leader_check_centre_click", { answered, to: "data-sheet" }, AT)}
      className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-ink-600 underline decoration-clay-200 underline-offset-4 hover:text-ink-900"
      data-testid="leader-offer-data-sheet"
    >
      <FileText className="h-3.5 w-3.5 flex-none" /> For your owner, board or approved provider: the one-page data sheet
    </Link>
  );
}

function StoryPage({ view, token, preview, onView, heading }: PageProps<LeaderView>) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const answered = Boolean(view.decision);
  const child = view.childName || "this child";

  const answer = async (decision: "approved" | "changes") => {
    if (saving || preview) return;
    if (decision === "changes" && !comment.trim()) { setError("Say what you would change, so they know what to fix."); return; }
    setSaving(true); setError("");
    try {
      const { ok, data } = await post({ token, action: "answer", decision, name, comment: decision === "changes" ? comment : "" });
      if (!ok || !data.view) { setError(data.error ?? "That did not save. Try again."); return; }
      onView(data.view);
      track("leader_check_answered", { decision, kind: "story", all: false }, AT);
    } catch {
      setError("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const showOffer = !ORDER.offerAfterAnswer || answered;
  return (
    <div className="wide-shell" data-testid="leader-check">
      <div className={`mx-auto max-w-3xl ${!answered ? "pb-28" : ""}`}>
        <p className="text-sm font-bold uppercase tracking-wider text-clay-700">From {view.educator}{view.centreName ? ` at ${view.centreName}` : ""}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 outline-none md:text-4xl">
          {view.educator} asked you to check this learning story
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-600">
          First what {view.educator} wrote down, then the story drafted from it{view.writtenOn ? ` on ${day(view.writtenOn)}` : ""}.
        </p>

        <div className="mt-6 grid min-w-0 gap-5">
          <NoteCard educator={view.educator} note={view.note} />
          <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="check-story">
            <h2 id="check-story" className="text-xs font-bold uppercase tracking-wider text-ink-500">The story</h2>
            <div className="mt-3 min-w-0" data-testid="leader-check-story">
              <StoryText text={view.story} />
            </div>
            <details className="group mt-5 rounded-2xl border border-sage-200 bg-sage-50 p-4">
              <summary className="flex min-h-[28px] cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sage-900 [&::-webkit-details-marker]:hidden">
                <ShieldCheck className="h-4 w-4 flex-none" /> What to look for <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-700">
                <li>Anything {child} says in the story should be in the note, word for word.</li>
                <li>Nothing should happen in the story that the note does not show.</li>
                <li>The curriculum links should fit what {child} actually did.</li>
              </ul>
            </details>
            {!answered && (
              <div className="mt-5 max-w-sm">
                <label htmlFor="leader-name" className="label">Your first name (optional)</label>
                <input id="leader-name" value={name} maxLength={CHECK_NAME_MAX} onChange={(e) => setName(e.target.value)} autoComplete="given-name" className="input" disabled={preview} />
              </div>
            )}
          </section>
        </div>

        {answered ? (
          <section className="card mt-5 p-5 sm:p-6" aria-live="polite" data-testid="leader-check-thanks">
            <p className="flex items-center gap-2 font-display text-xl font-bold text-sage-900">
              <CheckCircle2 className="h-5 w-5 flex-none" />
              {view.decision === "approved" ? `Thank you. ${view.educator} can see it looks good.` : `Thank you. ${view.educator} can see your suggestion.`}
            </p>
            {view.comment && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-cream-50 p-3 text-sm leading-relaxed text-ink-700">{view.comment}</p>}
          </section>
        ) : (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-clay-100 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-soft backdrop-blur" data-testid="leader-check-answer-bar">
            <div className="mx-auto max-w-3xl">
              {suggesting && (
                <div className="mb-3">
                  <label htmlFor="leader-comment" className="label">What would you change?</label>
                  <textarea
                    id="leader-comment"
                    value={comment}
                    maxLength={CHECK_COMMENT_MAX}
                    onChange={(e) => { setComment(e.target.value); if (error) setError(""); }}
                    rows={3}
                    className="input resize-none text-sm leading-relaxed"
                    placeholder="For example: the second paragraph says more than the note shows."
                    autoFocus
                  />
                </div>
              )}
              {error && <p className="mb-2 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800" role="alert">{error}</p>}
              <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                {suggesting ? (
                  <>
                    <button type="button" onClick={() => answer("changes")} disabled={saving || preview} className="btn-primary min-h-[48px] justify-center px-4 text-base disabled:opacity-60" data-testid="leader-check-send-changes">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />} Send my suggestion
                    </button>
                    <button type="button" onClick={() => { setSuggesting(false); setError(""); }} disabled={saving} className="btn-secondary min-h-[48px] justify-center px-4 text-base">Back</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => answer("approved")} disabled={saving || preview} className="btn-primary min-h-[48px] justify-center px-4 text-base disabled:opacity-60" data-testid="leader-check-approve">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Looks good
                    </button>
                    <button type="button" onClick={() => setSuggesting(true)} disabled={saving || preview} className="btn-secondary min-h-[48px] justify-center px-4 text-base disabled:opacity-60" data-testid="leader-check-suggest">
                      Suggest a change
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No offer at all when the educator ended it or is already in a centre (lib/story-check-server.ts). */}
        {showOffer && <StartBlock view={view} answered={answered} preview={preview} />}

        <p className="mt-5 text-xs leading-relaxed text-ink-500">
          This link opens this one story only, until {day(view.expiresAt)}. Please do not pass it on.
        </p>
      </div>
    </div>
  );
}

function PieceBody({ piece }: { piece: SetPieceView }) {
  const label = keptStrategyLabel(piece.framework, piece.mode);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-800">
      {piece.draft.outcomes.map((o, i) => (
        <div key={i}>
          <p className="font-semibold text-ink-900">{o.outcome}</p>
          <p>{o.seen ? `What I saw: ${o.seen}` : `Not in my notes yet: ${o.gap}`}</p>
          {o.strategy && <p className="text-ink-700">{label}: {o.strategy}</p>}
        </div>
      ))}
    </div>
  );
}

function SetPage({ view, token, preview, onView, heading }: PageProps<SetView>) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allDone, setAllDone] = useState("");
  const left = view.items.filter((item) => !item.decision).length;
  const answered = view.items.length > 0 && left === 0;

  const send = async (body: Record<string, unknown>, all: boolean) => {
    if (saving || preview) return;
    setSaving(true); setError("");
    try {
      const { ok, data } = await post({ token, ...body });
      if (!ok || !data.view) { setError(data.error ?? "That did not save. Try again."); return; }
      onView(data.view);
      setSuggesting(false); setComment("");
      if (all) setAllDone(`${data.answered ?? 0} marked as looking good.`);
      else setOpenAt(null);
      track("leader_check_answered", { decision: body.decision === "changes" ? "changes" : "approved", kind: "set", all }, AT);
    } catch {
      setError("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const answerOne = (position: number, decision: "approved" | "changes") => {
    if (decision === "changes" && !comment.trim()) { setError("Say what you would change, so they know what to fix."); return; }
    void send({ action: "answer_item", position, decision, comment: decision === "changes" ? comment : "" }, false);
  };

  const save = () => {
    if (preview) return;
    try {
      const blob = new Blob([setText(view)], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = setFileName(view);
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      track("leader_set_saved", { pieces: view.items.length }, AT);
    } catch {
      setError("Could not save the file. Try again.");
    }
  };

  const noun = view.items.length === 1 ? "statement" : "statements";
  return (
    <div className="wide-shell" data-testid="leader-check" data-kind="set">
      <div className={`mx-auto max-w-3xl ${!answered ? "pb-28" : ""}`}>
        <p className="text-sm font-bold uppercase tracking-wider text-clay-700">From {view.educator}{view.centreName ? ` at ${view.centreName}` : ""}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 outline-none">
          {view.items.length} {noun} from {view.educator}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-600">Tap any to read it, or mark them all as looking good.</p>

        <ul className="mt-5 divide-y divide-clay-100 overflow-hidden rounded-2xl border border-clay-100 bg-paper" data-testid="leader-set-list">
          {view.items.map((piece) => {
            const open = openAt === piece.position;
            return (
              <li key={piece.position} data-testid="leader-set-row" data-position={piece.position} data-decision={piece.decision ?? ""}>
                <button
                  type="button"
                  onClick={() => { setOpenAt(open ? null : piece.position); setSuggesting(false); setError(""); }}
                  aria-expanded={open}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{piece.childName || "A child"}</span>
                  <span className="flex-none rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">{pieceKindLabel(piece.mode)}</span>
                  <span className="w-5 flex-none" aria-label={piece.decision ? (piece.decision === "approved" ? "Looks good" : "Change suggested") : "Not answered"}>
                    {piece.decision === "approved" ? <CheckCircle2 className="h-5 w-5 text-sage-700" /> : piece.decision === "changes" ? <MessageSquareText className="h-5 w-5 text-clay-700" /> : null}
                  </span>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-clay-100 bg-cream-50/60 px-4 py-4" data-testid="leader-set-piece">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">What {view.educator} wrote down</p>
                      <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink-800">{piece.note}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">The draft</p>
                      <div className="mt-2"><PieceBody piece={piece} /></div>
                    </div>
                    {piece.decision ? (
                      <p className="text-sm font-semibold text-sage-900">{piece.decision === "approved" ? "You said it looks good." : `You suggested a change${piece.comment ? `: ${piece.comment}` : "."}`}</p>
                    ) : view.state === "open" && (
                      <div>
                        {suggesting && (
                          <textarea value={comment} maxLength={CHECK_COMMENT_MAX} onChange={(e) => { setComment(e.target.value); setError(""); }} rows={3} className="input mb-2 resize-none text-sm" placeholder="What would you change?" aria-label="What would you change?" data-testid="leader-set-comment" autoFocus />
                        )}
                        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                          {suggesting ? (
                            <button type="button" onClick={() => answerOne(piece.position, "changes")} disabled={saving || preview} className="btn-primary min-h-[48px] justify-center text-sm" data-testid="leader-set-send-changes">Send my suggestion</button>
                          ) : (
                            <button type="button" onClick={() => answerOne(piece.position, "approved")} disabled={saving || preview} className="btn-primary min-h-[48px] justify-center text-sm" data-testid="leader-set-approve">Looks good</button>
                          )}
                          <button type="button" onClick={() => { setSuggesting(!suggesting); setError(""); }} disabled={saving || preview} className="btn-secondary min-h-[48px] justify-center text-sm" data-testid="leader-set-suggest">{suggesting ? "Back" : "Suggest a change"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button type="button" onClick={save} disabled={preview} className="btn-secondary mt-4 min-h-[44px] w-full justify-center text-sm" data-testid="leader-set-save">
          <Download className="h-4 w-4" /> Save all as one file
        </button>

        {error && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800" role="alert">{error}</p>}

        {answered && (
          <section className="card mt-5 p-5" aria-live="polite" data-testid="leader-check-thanks">
            <p className="flex items-center gap-2 font-display text-xl font-bold text-sage-900">
              <CheckCircle2 className="h-5 w-5 flex-none" /> Thank you. {view.educator} can see your answers.
            </p>
            {allDone && <p className="mt-1 text-sm text-ink-600">{allDone}</p>}
          </section>
        )}

        {!answered && view.state === "open" && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-clay-100 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-soft backdrop-blur">
            <div className="mx-auto max-w-3xl">
              <button type="button" onClick={() => send({ action: "answer_all", decision: "approved" }, true)} disabled={saving || preview} className="btn-primary min-h-[48px] w-full justify-center text-base disabled:opacity-60" data-testid="leader-set-all">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} All look good ({left} left)
              </button>
            </div>
          </div>
        )}

        {(!ORDER.offerAfterAnswer || answered) && <StartBlock view={view} answered={answered} preview={preview} />}

        <p className="mt-5 text-xs leading-relaxed text-ink-500">
          This link opens these statements only, until {day(view.expiresAt)}. Please do not pass it on.
        </p>
      </div>
    </div>
  );
}
