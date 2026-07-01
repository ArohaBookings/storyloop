"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Feather, Loader2, Check, X, ThumbsUp, ThumbsDown, Sparkles, LockKeyhole } from "lucide-react";
import StoryText from "@/components/app/StoryText";
import QuillChat from "@/components/app/QuillChat";
import { hasFeatureAccess } from "@/lib/plans";
import type { StoryFrameworkId } from "@/lib/story-options";

// Quill: the educator's own writing helper.
//  - Inline: highlight any line, a small box pops up right there, ask for a
//    change, and the note updates in place with the change highlighted.
//  - Chat: the "Ask Quill" button opens a conversation for advice or changes.

const QUICK_ASKS = ["Add a little more detail", "Make this warmer", "Shorten this", "Use simpler words"];

// Word-level diff: find the shared start and end so we highlight only the part
// Quill actually changed.
function diffChangedRegion(before: string, after: string) {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p += 1;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s += 1;
  return b.slice(p, b.length - s).join("").trim();
}

type Result = { editId: string | null; story: string; summary: string; changed: string };

export default function QuillAssistant({
  story,
  storyId,
  childId,
  framework,
  childName,
  plan,
  onApply,
}: {
  story: string;
  storyId?: string;
  childId?: string;
  framework: StoryFrameworkId;
  childName?: string;
  plan: string;
  onApply: (newStory: string) => void;
}) {
  const canUse = hasFeatureAccess(plan, "storyAssistant");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selfEditRef = useRef(false);
  // Viewport rect of the current selection, so the chip and composer can be
  // positioned as fixed elements (never clipped by an overflow-hidden card).
  const anchorRef = useRef<{ top: number; bottom: number; left: number; width: number } | null>(null);

  const [selection, setSelection] = useState("");
  const [chip, setChip] = useState<{ top: number; left: number } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPos, setComposerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [preview, setPreview] = useState<Result | null>(null);
  const [applied, setApplied] = useState<Result | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<null | 1 | -1>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const closeAll = useCallback(() => {
    setSelection("");
    setChip(null);
    setComposerOpen(false);
    setInstruction("");
    setError("");
    setUpgrade(false);
    setLoading(false);
    setPreview(null);
    if (typeof window !== "undefined") window.getSelection()?.removeAllRanges();
  }, []);

  // Reset transient UI when the story changes (regenerated), but not when the
  // change came from our own accepted edit (so the feedback prompt survives).
  useEffect(() => {
    if (selfEditRef.current) { selfEditRef.current = false; return; }
    closeAll();
    setApplied(null);
    setFeedbackGiven(null);
  }, [story, closeAll]);

  const handleSelection = useCallback(() => {
    if (!canUse || loading || preview || composerOpen) return;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    const text = sel?.toString().trim() ?? "";
    const container = containerRef.current;
    if (!sel || !text || text.length < 3 || !container || sel.rangeCount === 0) {
      setChip(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    anchorRef.current = { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width };
    setSelection(text);
    // Fixed (viewport) coordinates.
    setChip({
      top: Math.max(rect.top - 44, 8),
      left: Math.min(Math.max(rect.left + rect.width / 2 - 52, 8), (typeof window !== "undefined" ? window.innerWidth : 400) - 116),
    });
  }, [canUse, loading, preview, composerOpen]);

  const openComposer = () => {
    const a = anchorRef.current;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const vh = typeof window !== "undefined" ? window.innerHeight : 700;
    setComposerPos({
      top: a ? Math.min(a.bottom + 8, vh - 240) : 120,
      left: a ? Math.min(Math.max(a.left, 8), vw - 336) : 16,
    });
    setChip(null);
    setError("");
    setComposerOpen(true);
  };

  const submit = async (ask?: string) => {
    const request = (ask ?? instruction).trim();
    if (request.length < 2) { setError("Tell Quill what to change."); return; }
    setLoading(true);
    setError("");
    setUpgrade(false);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, selection, instruction: request, storyId, framework, childName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeRequired) setUpgrade(true);
        throw new Error(data.error ?? "Quill couldn't make that change.");
      }
      setComposerOpen(false);
      setPreview({ editId: data.editId ?? null, story: data.story, summary: data.summary, changed: diffChangedRegion(story, data.story) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const applyResult = (r: Result) => {
    selfEditRef.current = true;
    onApply(r.story);
    setPreview(null);
    setSelection("");
    setApplied(r);
    setFeedbackGiven(null);
    if (typeof window !== "undefined") window.getSelection()?.removeAllRanges();
    if (r.editId) {
      void fetch(`/api/refine/${r.editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
    }
  };

  const sendFeedback = (value: 1 | -1) => {
    setFeedbackGiven(value);
    if (applied?.editId) {
      void fetch(`/api/refine/${applied.editId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value }),
      });
    }
  };

  const shownStory = preview ? preview.story : story;

  return (
    <div className="relative">
      {/* Top bar: obvious entry points (only when the educator can use Quill) */}
      {canUse && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <Feather className="h-3.5 w-3.5 text-clay-600" />
            Highlight any line to refine it, or ask <span className="font-bold text-clay-700">Quill</span> anything.
          </p>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-clay-700 px-3.5 py-1.5 text-xs font-bold text-paper shadow-warm transition-all hover:bg-clay-800"
          >
            <Feather className="h-3.5 w-3.5" /> Ask Quill
          </button>
        </div>
      )}

      <div ref={containerRef} onMouseUp={handleSelection} onTouchEnd={handleSelection} className="relative">
        <StoryText text={shownStory} highlight={preview?.changed || undefined} />

        {/* Floating selection chip */}
        {chip && canUse && !composerOpen && !preview && (
          <button
            type="button"
            onClick={openComposer}
            style={{ top: chip.top, left: chip.left }}
            className="fixed z-40 flex items-center gap-1.5 rounded-full bg-clay-700 px-3 py-1.5 text-xs font-bold text-paper shadow-warm transition-transform hover:scale-105"
          >
            <Feather className="h-3.5 w-3.5" /> Ask Quill
          </button>
        )}

        {/* Compact inline composer popover */}
        {composerOpen && canUse && (
          <div
            style={{ top: composerPos.top, left: composerPos.left }}
            className="fixed z-50 w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-clay-200 bg-white p-3 shadow-warm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-clay-700"><Feather className="h-3.5 w-3.5" /> Ask Quill</span>
              <button onClick={closeAll} className="text-ink-400 hover:text-ink-700" aria-label="Close"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {QUICK_ASKS.map((ask) => (
                <button key={ask} onClick={() => { setInstruction(ask); void submit(ask); }} disabled={loading}
                  className="rounded-full border border-clay-200 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-600 hover:border-clay-400 hover:text-clay-700 disabled:opacity-50">
                  {ask}
                </button>
              ))}
            </div>
            <textarea
              value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} autoFocus
              placeholder="e.g. add a line about how she helped her friend"
              className="input resize-none text-sm" disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(); }}
            />
            {error && !upgrade && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
            {upgrade && (
              <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                {error} <Link href="/billing?feature=storyAssistant" className="font-bold text-clay-700">Unlock with Educator Pro →</Link>
              </p>
            )}
            <div className="mt-2 flex justify-end">
              <button onClick={() => void submit()} disabled={loading || instruction.trim().length < 2} className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50">
                {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Refining…</> : <><Sparkles className="h-3.5 w-3.5" /> Refine</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview action bar (change is shown in place above) */}
      {preview && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-sage-200 bg-sage-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-sage-800">
            <Feather className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {preview.summary}
          </p>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button onClick={() => { setPreview(null); }} className="btn-ghost text-xs">Discard</button>
            <button onClick={() => applyResult(preview)} className="btn-primary px-4 py-2 text-xs"><Check className="h-3.5 w-3.5" /> Keep change</button>
          </div>
        </div>
      )}

      {/* Feedback after applying */}
      {applied && !preview && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-sage-200 bg-sage-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-sage-800"><Check className="h-4 w-4" /> Quill updated your story.</p>
          <div className="flex items-center gap-2">
            {feedbackGiven === null ? (
              <>
                <span className="text-[11px] text-ink-500">Was that helpful?</span>
                <button onClick={() => sendFeedback(1)} className="rounded-full border border-clay-200 bg-white p-1.5 text-ink-500 hover:text-sage-700" aria-label="Helpful"><ThumbsUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => sendFeedback(-1)} className="rounded-full border border-clay-200 bg-white p-1.5 text-ink-500 hover:text-red-600" aria-label="Not helpful"><ThumbsDown className="h-3.5 w-3.5" /></button>
              </>
            ) : <span className="text-[11px] font-semibold text-sage-700">Thanks, noted.</span>}
            <button onClick={() => { setApplied(null); setFeedbackGiven(null); }} className="btn-ghost text-xs">Done</button>
          </div>
        </div>
      )}

      {/* Locked state for free plans */}
      {!canUse && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-clay-200 bg-gradient-to-br from-cream-50 to-white p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-ink-600">
            <Feather className="h-4 w-4 text-clay-600" />
            <span><span className="font-bold text-clay-700">Quill</span> lets you highlight any line and refine it, or ask for advice in plain English.</span>
          </p>
          <Link href="/billing?feature=storyAssistant" className="btn-secondary justify-center whitespace-nowrap px-3 py-1.5 text-xs">
            <LockKeyhole className="h-3 w-3" /> Unlock Quill
          </Link>
        </div>
      )}

      {chatOpen && canUse && (
        <QuillChat
          story={story}
          storyId={storyId}
          childId={childId}
          framework={framework}
          childName={childName}
          selection={selection}
          onApply={(newStory, editId) => {
            selfEditRef.current = true;
            onApply(newStory);
            setApplied({ editId: editId ?? null, story: newStory, summary: "Quill updated your story.", changed: "" });
            setFeedbackGiven(null);
          }}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
