"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { TransitionDraft, TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";

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
    EYLF: "NSW, Queensland or other (EYLF V2.0 outcomes)",
    TW: "Aotearoa (Te Whāriki strands)",
  },
  summary: {
    VEYLDF: "Victoria (VEYLDF outcomes)",
    EYLF: "Australia (EYLF V2.0 outcomes)",
    TW: "Aotearoa (Te Whāriki strands)",
  },
};

const strategyLabelFor = (framework: TransitionFramework, mode: TransitionMode) =>
  mode === "summary" ? "Next step" : framework === "TW" ? "Strategy for the new entrant teacher" : "Strategy for the Prep teacher";

export default function TransitionDemo({
  framework: initialFramework,
  mode,
  choices,
}: {
  framework: TransitionFramework;
  mode: TransitionMode;
  /** Let the reader pick their state or curriculum (the transition and end-of-year pages serve more than one). */
  choices?: TransitionFramework[];
}) {
  const [framework, setFramework] = useState<TransitionFramework>(initialFramework);
  const [notes, setNotes] = useState("");
  const [usingSample, setUsingSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TransitionDraft | null>(null);
  const [copied, setCopied] = useState(false);
  // From the draft on screen, not the picker: switching the picker after a
  // draft must not relabel it.
  const strategyLabel = draft ? strategyLabelFor(draft.framework, draft.mode) : strategyLabelFor(framework, mode);

  const run = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    // Own event names, so the learning-story demo's numbers in admin stay its own.
    track("transition_demo_started", { mode, framework, sample: usingSample, inputWords: notes.trim().split(/\s+/).length });
    try {
      const res = await fetch("/api/transition-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, framework, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) {
        setError(data.error ?? "Something went wrong. Try again in a minute.");
        track("transition_demo_error", { status: res.status, code: data.code ?? null });
        return;
      }
      setDraft(data.draft);
      track("transition_demo_completed", {
        mode,
        framework,
        sample: usingSample,
        filled: (data.draft as TransitionDraft).outcomes.filter((o) => o.seen).length,
      });
    } catch {
      setError("Something went wrong. Try again in a minute.");
      track("transition_demo_error", { status: 0 });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="card-warm min-w-0 p-5 sm:p-6">
        {choices && choices.length > 1 && (
          <div className="mb-4">
            <label htmlFor="transition-framework" className="section-title">Where you teach</label>
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              setNotes(SAMPLE);
              setUsingSample(true);
            }}
            className="text-left text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
            data-track="transition_sample"
          >
            Fill in an example first
          </button>
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
          No signup. Use a first name only. Your notes and the draft are not saved to any account and are never used to train AI. Check
          your service&apos;s policy on children&apos;s information.
        </p>
        {error && <p role="alert" className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">{error}</p>}
      </div>

      <div className="card-warm min-w-0 p-5 sm:p-6" aria-live="polite">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="section-title">{mode === "summary" ? "Your summary, outcome by outcome" : "Your draft, outcome by outcome"}</p>
          {draft && (
            <button type="button" onClick={copyAll} className="btn-ghost px-3 py-1 text-xs" data-track="transition_copy">
              {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
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
              <p className="mb-2 text-sm text-ink-700">
                It is a draft from your notes: check every line. You decide what is true and what goes in the statement.
              </p>
              <p className="mb-3 text-sm text-ink-600">
                Next year, start from a year of evidence: StoryLoop turns quick notes into learning stories through the year. 3 a month
                free, no card.
              </p>
              <Link href="/signup" className="btn-primary px-4 py-2 text-sm" data-track="transition_demo_signup">
                Start free
              </Link>
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
