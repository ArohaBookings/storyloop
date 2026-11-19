"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { frameworkForZone } from "@/lib/statement-from-notes";
import Link from "next/link";
import { Check, Copy, Loader2, Sparkles, UserRoundPlus } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { trackEvent } from "@/lib/analytics/track-event";
import { rememberStatement } from "@/lib/keep-story";
import type { TransitionDraft, TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import { STATEMENT_SIGNUP_HREF } from "@/lib/signup-next";

/**
 * "Paste your notes, get the five outcomes drafted" on the TLDS, transition
 * and end-of-year guides (19 Oct 2026). The why is in
 * lib/ai/transition-draft.ts: these readers came to finish this exact job and
 * the learning-story demo was not it. No signup; nothing is saved.
 */
const SAMPLE =
  "Arlo (4). Settles best with a job: after drop-off he goes straight to water the veggie garden. Watches games for a few minutes before joining; joined What's the Time Mr Wolf when asked to be the wolf. Built a marble run for about 25 minutes and said \"it needs to go steeper\", then raised one end and tried again. Talks in short sentences and points to show what he means. The picture timetable and a two-minute warning helped him at pack-up time.";

const FRAMEWORK_LABEL: Record<TransitionMode, Record<TransitionFramework, string>> = {
  transition: {
    VEYLDF: "Victoria (TLDS, VEYLDF outcomes)",
    EYLF: "NSW or another state (EYLF V2.0 outcomes)",
    QKLG: "Queensland (kindergarten transition statement, QKLG areas)",
    TW: "Aotearoa (Te Whāriki strands)",
  },
  summary: {
    VEYLDF: "Victoria (VEYLDF outcomes)",
    EYLF: "Australia (EYLF V2.0 outcomes)",
    QKLG: "Queensland (QKLG areas)",
    TW: "Aotearoa (Te Whāriki strands)",
  },
};

// The first year of school is Prep in Victoria and Queensland, Kindergarten in
// NSW and Reception or Pre-primary elsewhere, so the EYLF label names no year.
const STRATEGY_LABEL: Record<TransitionFramework, string> = {
  VEYLDF: "Strategy for the Prep teacher",
  EYLF: "Strategy for the school teacher",
  QKLG: "Suggestion for continuity",
  TW: "Strategy for the new entrant teacher",
};
const strategyLabelFor = (framework: TransitionFramework, mode: TransitionMode) =>
  mode === "summary" ? "Next step" : STRATEGY_LABEL[framework];

export default function TransitionDemo({
  framework: initialFramework,
  mode,
  choices,
  endpoint = "/api/transition-draft",
  inApp = false,
  childName = "",
  onNextChild,
  allowanceNote,
  initialNotes,
  initialDraft,
  renderLimitWall,
  hero = false,
  followZone = false,
}: {
  framework: TransitionFramework;
  mode: TransitionMode;
  /** Let the reader pick their state or curriculum (the transition and end-of-year pages serve more than one). */
  choices?: TransitionFramework[];
  /** Where the draft comes from. The signed-in page uses its own route, with the account's allowance. */
  endpoint?: string;
  /** Inside the app (the Statement page): no signup pitch, and its own event names. */
  inApp?: boolean;
  /** The child's first name, when the page asks for it separately. */
  childName?: string;
  /**
   * Inside the app: "Next child" beside Copy all clears the notes and the draft
   * (and, through this, the name the page holds) and keeps the document and the
   * curriculum, so a whole class can be done in one sitting (12 Nov 2026).
   */
  onNextChild?: () => void;
  /** A quiet line under the notes box (the free plan's allowance, in the app). */
  allowanceNote?: ReactNode;
  /** Inside the app: the notes and draft to start with, when she comes back from checkout. */
  initialNotes?: string;
  initialDraft?: TransitionDraft | null;
  /**
   * Inside the app: the free-limit wall, shown in place of the refusal line. Her
   * notes and any draft stay on screen above it (18 Nov 2026).
   */
  /** limit: which free allowance she reached, this hour's or today's (the app's statement wall says which). */
  renderLimitWall?: (work: { notes: string; draft: TransitionDraft | null; framework: TransitionFramework; mode: TransitionMode; dismiss: () => void; limit: "hour" | "day" }) => ReactNode;
  /**
   * At the top of a guide (18 Nov 2026): the same box and the same request,
   * laid out so the box and its button sit on a phone's first screen. Only the
   * wrapper spacing and the order of the button row change.
   */
  hero?: boolean;
  /** Open on the visitor's own curriculum, from her time zone (review 2, R2-11), when it is one of the choices. */
  followZone?: boolean;
}) {
  const [framework, setFramework] = useState<TransitionFramework>(initialFramework);
  useEffect(() => {
    if (!followZone || initialDraft) return;
    let zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* keep the page's own */ }
    const own = frameworkForZone(zone);
    if ((choices ?? []).includes(own)) setFramework(own);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [usingSample, setUsingSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TransitionDraft | null>(initialDraft ?? null);
  const [copied, setCopied] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [limitKind, setLimitKind] = useState<"hour" | "day">("hour");
  // The public drafter's hourly or daily limit (18 Nov 2026): one button that
  // keeps the draft on screen and opens a free account, instead of a dead end.
  const [publicLimit, setPublicLimit] = useState(false);
  const notesBox = useRef<HTMLTextAreaElement>(null);
  const startedAt = useRef(0);
  const kind = mode === "summary" ? "summary" : "statement";
  const pagePath = () => (typeof window === "undefined" ? "/" : window.location.pathname);
  // The public demo and the signed-in page are counted apart in admin.
  const ev = inApp ? "app_statement" : "transition_demo";
  // From the draft on screen, not the picker: switching the picker after a
  // draft must not relabel it.
  const strategyLabel = draft ? strategyLabelFor(draft.framework, draft.mode) : strategyLabelFor(framework, mode);

  const run = async () => {
    if (loading) return;
    setError("");
    setLimitHit(false);
    setPublicLimit(false);
    setLoading(true);
    startedAt.current = Date.now();
    if (!inApp) trackEvent("guide_drafter_started", { page: pagePath(), kind });
    // Own event names, so the learning-story demo's numbers in admin stay its own.
    track(`${ev}_started`, { mode, framework, sample: usingSample, inputWords: notes.trim().split(/\s+/).length });
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(childName.trim() ? { notes, framework, mode, childName } : { notes, framework, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) {
        setError(data.error ?? "Something went wrong. Try again in a minute.");
        setLimitHit(data.code === "free_limit");
        setLimitKind(data.limit === "day" ? "day" : "hour");
        if (!inApp && (data.code === "limit" || data.code === "daily_limit")) {
          setPublicLimit(true);
          trackEvent("wall_shown", { wall: "guide_drafter" });
        }
        track(`${ev}_error`, { status: res.status, code: data.code ?? null });
        return;
      }
      setDraft(data.draft);
      // On a guide, her own draft is remembered as she writes it, so any way she
      // goes to signup carries it (lib/keep-story.ts). The sample child is not.
      if (!inApp && !usingSample) {
        const d = data.draft as TransitionDraft;
        rememberStatement({ framework: d.framework, mode: d.mode, outcomes: d.outcomes, checks: d.checks }, true);
      }
      track(`${ev}_completed`, {
        mode,
        framework,
        sample: usingSample,
        filled: (data.draft as TransitionDraft).outcomes.filter((o) => o.seen).length,
      });
      if (!inApp) trackEvent("guide_drafter_finished", { page: pagePath(), kind, seconds: Math.round((Date.now() - startedAt.current) / 1000) });
    } catch {
      setError("Something went wrong. Try again in a minute.");
      track(`${ev}_error`, { status: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Kept in this browser and shown again on /statement after signup (lib/keep-story.ts).
  const keepDraft = () => {
    if (draft) rememberStatement({ framework: draft.framework, mode: draft.mode, outcomes: draft.outcomes, checks: draft.checks });
  };

  const copyAll = async () => {
    if (!draft) return;
    const text = draft.outcomes
      .map((o) => [o.outcome, o.seen ? `What I saw: ${o.seen}` : `Not in my notes yet: ${o.gap}`, o.strategy ? `${strategyLabel}: ${o.strategy}` : ""].filter(Boolean).join("\n"))
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the reader can still select the text */
    }
  };

  // The same document and curriculum, a clean box, and the cursor in it.
  const nextChild = () => {
    setNotes("");
    setUsingSample(false);
    setDraft(null);
    setError("");
    setLimitHit(false);
    setCopied(false);
    onNextChild?.();
    const box = notesBox.current;
    if (box) {
      box.focus({ preventScroll: true });
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
      <div className={`card-warm min-w-0 ${hero ? "p-3.5" : "p-5"} sm:p-6`} data-testid={hero ? "guide-hero-drafter" : undefined}>
        {choices && choices.length > 1 && (
          // At the top of a guide the picker sits on one line beside its label, so the note box and its button fit the first phone screen.
          <div className={hero ? "mb-3 flex items-center gap-2 [&>select]:mt-0 [&>select]:min-w-0 [&>select]:flex-1 [&>select]:py-2 [&>select]:text-sm" : "mb-4"}>
            <label htmlFor="transition-framework" className={hero ? "section-title flex-none" : "section-title"}>Where you teach</label>
            <select
              id="transition-framework"
              value={framework}
              onChange={(e) => setFramework(e.target.value as TransitionFramework)}
              className="input mt-2"
            >
              {choices.map((choice) => (
                <option key={choice} value={choice}>{FRAMEWORK_LABEL[mode][choice]}</option>
              ))}
            </select>
          </div>
        )}
        <label htmlFor="transition-notes" className="section-title">What you know about this child</label>
        <textarea
          ref={notesBox}
          id="transition-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setUsingSample(false);
          }}
          rows={8}
          maxLength={3000}
          className="input mt-2 min-h-[11rem] resize-y font-mono text-[14px] leading-relaxed"
          placeholder="Two or three moments from your documentation, a few lines each: what they did, anything they said, and what helped. First name only."
        />
        {/* At the top of a guide the button comes first on a phone, straight under the box. */}
        <div className={`mt-3 flex gap-2 sm:flex-row sm:items-center sm:justify-between ${hero ? "flex-col-reverse" : "flex-col"}`}>
          {inApp ? (
            // No sample in the app: a free account would spend one of its free
            // drafts (a paid model call) on a child who is not theirs.
            <span aria-hidden="true" />
          ) : (
          <button
            type="button"
            onClick={() => {
              setNotes(SAMPLE);
              setUsingSample(true);
            }}
            className="inline-flex min-h-[44px] items-center text-left text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
            data-track="transition_sample"
          >
            Fill in an example first
          </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={loading || notes.trim().length < 80}
            className="btn-primary w-full justify-center text-sm sm:w-auto"
            data-track="transition_demo_run"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mode === "summary" ? "Draft the summary" : "Draft the five outcomes"}
          </button>
        </div>
        {notes.trim().length > 0 && notes.trim().length < 80 && (
          <p className="mt-2 text-xs text-ink-500">A little more: two or three moments, a few lines each.</p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          {inApp
            ? "Use a first name only. The notes and the draft are not saved: copy what you want to keep. They are never used to train AI."
            : "No signup. Use a first name only. Your notes and the draft are not saved to any account and are never used to train AI. Check your service's policy on children's information."}
        </p>
        {allowanceNote}
        {limitHit && renderLimitWall && (
          <div className="mt-3">
            {renderLimitWall({ notes, draft, framework, mode, limit: limitKind, dismiss: () => { setLimitHit(false); setError(""); } })}
          </div>
        )}
        {error && !(limitHit && renderLimitWall) && (
          <p role="alert" className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">
            {error}{" "}
            {limitHit && (
              <Link href="/billing" className="font-bold underline" data-track="statement_limit_upgrade">
                See the plans
              </Link>
            )}
          </p>
        )}
        {publicLimit && !inApp && (
          <div className="mt-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-3 text-sm text-ink-800" data-testid="transition-limit">
            <p>{draft ? "Keep this draft in a free account, no card, and carry on there." : "Carry on in a free account, no card."}</p>
            <Link
              href={STATEMENT_SIGNUP_HREF}
              onClick={() => {
                keepDraft();
                trackEvent("guide_limit_tap", { page: pagePath(), wall: "guide_drafter" });
              }}
              className="btn-primary mt-2 inline-flex px-4 py-2 text-xs"
              data-track="transition_limit_keep"
            >
              {draft ? "Keep my draft, start free" : "Start free"}
            </Link>
          </div>
        )}
      </div>

      <div className="card-warm min-w-0 p-5 sm:p-6" aria-live="polite">
        {/* Wraps on a phone, so the title keeps its width and the buttons sit under it. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="section-title min-w-0 flex-1 basis-48">{(draft ? draft.mode : mode) === "summary" ? "Your summary, outcome by outcome" : "Your draft, outcome by outcome"}</p>
          {draft && (
            <div className="flex flex-none items-center gap-2">
              <button type="button" onClick={copyAll} className="btn-ghost min-h-[44px] px-3 py-1 text-xs sm:min-h-0" data-track="transition_copy">
                {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
              {inApp && (
                <button
                  type="button"
                  onClick={nextChild}
                  className="btn-secondary min-h-[44px] px-3 py-1 text-xs sm:min-h-0"
                  data-track="statement_next_child"
                  data-testid="statement-next-child"
                >
                  <UserRoundPlus className="h-3.5 w-3.5" />
                  Next child
                </button>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <p className="flex items-center gap-2 py-10 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading your notes, usually under a minute…
          </p>
        ) : draft ? (
          <div className="space-y-3">
            {draft.aiUnavailable && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-ink-800">
                Our AI writer is unavailable right now, so this is a simpler draft. Try again in a few minutes.
              </p>
            )}
            {draft.outcomes.map((o) => (
              <div key={o.outcome} className="rounded-2xl border border-clay-100 bg-paper p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-clay-700">{o.outcome}</p>
                {o.seen ? (
                  <>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-800">{o.seen}</p>
                    {o.strategy && (
                      <p className="mt-2 text-[15px] leading-relaxed text-ink-800">
                        <span className="font-semibold text-sage-800">{strategyLabel}:</span> {o.strategy}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5 text-sm italic leading-relaxed text-ink-500">Not in your notes yet. {o.gap}</p>
                )}
              </div>
            ))}
            {draft.checks.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Check before you use it</p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-800">
                  {draft.checks.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-clay-200 pt-4 text-center">
              {inApp ? (
                <>
                <p className="mb-2 text-sm text-ink-700">
                  It is a draft from your notes: check every line. You decide what is true and what goes in the statement.
                </p>
                <p className="text-sm text-ink-600">
                  Saved a few stories about this child? Their page drafts this straight from those, with their own words kept:{" "}
                  <Link href="/year" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
                    The year in one tap
                  </Link>
                  .
                </p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm text-ink-700" data-testid="transition-draft-caution">
                    It is a draft from your notes: check every line. You decide what is true and what goes in the statement.
                  </p>
                  {/* 12 Nov 2026: statements are due now, and the reader has a class of them, not one. */}
                  <p className="mb-2 text-sm font-semibold text-ink-800">
                    Got a whole class to write? Paste each child&apos;s notes and have every one drafted tonight.
                  </p>
                  <p className="mb-3 text-sm text-ink-600">A free account drafts three an hour. Educator covers as many as you need.</p>
                  {/* Keeps this draft for her new account (lib/keep-story.ts): it is waiting on /statement after signup. */}
                  <Link href={STATEMENT_SIGNUP_HREF} onClick={keepDraft} className="btn-primary px-4 py-2 text-sm" data-track="transition_demo_signup">
                    Keep this draft, start free
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-clay-400" />
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
              {mode === "summary"
                ? "For each outcome: what your notes show, and a next step. It is told to write only from your notes and to leave an outcome for you when they show nothing. Quotes it can't find in your notes are flagged."
                : "For each of the five outcomes: what your notes show, and a strategy the next teacher can use in week one. It is told to write only from your notes and to leave an outcome for you when they show nothing. Quotes it can't find in your notes are flagged."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
