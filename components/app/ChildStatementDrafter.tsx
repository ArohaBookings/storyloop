"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { TransitionDraft, TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";

const FRAMEWORK_LABEL: Record<TransitionFramework, string> = {
  TW: "Te Whāriki strands (Aotearoa)",
  EYLF: "EYLF V2.0 outcomes (NSW and other states)",
  VEYLDF: "VEYLDF outcomes (Victoria, TLDS)",
  QKLG: "QKLG areas (Queensland)",
};
const STRATEGY_LABEL: Record<TransitionFramework, string> = {
  VEYLDF: "Strategy for the Prep teacher",
  EYLF: "Strategy for the school teacher",
  QKLG: "Suggestion for continuity",
  TW: "Strategy for the new entrant teacher",
};

/**
 * One child's statement or end-of-year summary, drafted from the notes already
 * saved about them (lib/child-statement.ts). The educator checks every line.
 */
export default function ChildStatementDrafter({
  childId,
  childName,
  storyCount,
  defaultFramework,
  paid,
}: {
  childId: string;
  childName: string;
  storyCount: number;
  defaultFramework: TransitionFramework;
  paid: boolean;
}) {
  const [framework, setFramework] = useState<TransitionFramework>(defaultFramework);
  const [mode, setMode] = useState<TransitionMode>("transition");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TransitionDraft | null>(null);
  const [used, setUsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const strategyLabel = draft ? (draft.mode === "summary" ? "Next step" : STRATEGY_LABEL[draft.framework]) : "";
  const canDraft = storyCount >= 2;

  const run = async () => {
    if (loading || !canDraft) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${encodeURIComponent(childId)}/statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framework, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) {
        setError(data.error ?? "Something went wrong. Try again in a minute.");
        track("statement_error", { status: res.status, code: data.code ?? null });
        return;
      }
      setDraft(data.draft);
      setUsed(Number(data.storiesUsed) || 0);
      track("statement_drafted", { mode, framework, stories: Number(data.storiesUsed) || 0, paid });
    } catch {
      setError("Something went wrong. Try again in a minute.");
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
      /* the text can still be selected */
    }
  };

  return (
    <section id="draft" className="card mt-5 scroll-mt-24 p-5 sm:p-6 print:hidden">
      <p className="section-title mb-1">From {childName}&apos;s stories</p>
      <h2 className="font-display text-xl font-bold text-ink-900">Draft {childName}&apos;s transition statement or end-of-year summary</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        StoryLoop reads the notes you have already saved about {childName} and drafts each outcome: what your notes show, and a next step
        or a strategy for the next teacher. It only uses what you wrote down, keeps {childName}&apos;s words exactly, and leaves an outcome
        for you when your notes show nothing.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
          What to draft
          <select value={mode} onChange={(e) => setMode(e.target.value as TransitionMode)} className="input mt-1.5 w-full normal-case tracking-normal">
            <option value="transition">Transition statement</option>
            <option value="summary">End-of-year summary</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
          Curriculum
          <select value={framework} onChange={(e) => setFramework(e.target.value as TransitionFramework)} className="input mt-1.5 w-full normal-case tracking-normal">
            {(Object.keys(FRAMEWORK_LABEL) as TransitionFramework[]).map((f) => (
              <option key={f} value={f}>{FRAMEWORK_LABEL[f]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ink-500">
          {canDraft
            ? paid
              ? `Uses up to the last ${storyCount} notes about ${childName}.`
              : "Included on the free plan twice a month. Educator includes as many as you need."
            : `Save at least two stories about ${childName} first.`}
        </p>
        <button type="button" onClick={run} disabled={loading || !canDraft} className="btn-primary w-full justify-center text-sm sm:w-auto" data-track="statement_draft_run">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {mode === "summary" ? "Draft the summary" : "Draft the statement"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">
          {error}
          {!paid && /free plan/i.test(error) && (
            <>
              {" "}
              <Link href="/billing?feature=statements" className="font-semibold underline">See Educator</Link>
            </>
          )}
        </p>
      )}
      <div aria-live="polite">
        {loading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading {childName}&apos;s notes, usually under a minute…
          </p>
        )}
        {draft && !loading && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-500">Drafted from {used} saved {used === 1 ? "note" : "notes"}. Check every line before you use it.</p>
              <button type="button" onClick={copyAll} className="btn-ghost px-3 py-1 text-xs" data-track="statement_copy">
                {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            {draft.aiUnavailable && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-ink-800">
                The AI writer is unavailable right now, so this is a simpler draft. Try again in a few minutes.
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
          </div>
        )}
      </div>
    </section>
  );
}
