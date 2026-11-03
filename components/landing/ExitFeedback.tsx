"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/client";
import { EXIT_REASONS, EXIT_TEXT_MAX, cleanExitFeedback, type ExitReason, type ExitSurface } from "@/lib/exit-feedback";

const ASKED_KEY = "storyloop_exit_asked";

function alreadyAnswered() {
  try {
    return window.sessionStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}
function markAnswered() {
  try {
    window.sessionStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* fine */
  }
}

const THANKS = "Thank you. Leo reads every one of these.";

/**
 * "What's stopping you?" on /about (lib/exit-feedback.ts). Leo, 3 Nov 2026: a
 * good idea, but not on the homepage, the guides or signup, and no pop-up. The
 * first tap is the answer and is counted once per visit; a typed note follows
 * as its own event (note: true), so reasons are counted from the taps alone.
 */
export default function ExitFeedback({ surface }: { surface: ExitSurface }) {
  const [state, setState] = useState<"open" | "thanked" | "hidden">("open");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (alreadyAnswered()) setState("hidden");
  }, []);

  const send = (picked: ExitReason, note: string, isNote: boolean) => {
    const clean = cleanExitFeedback({ reason: picked, surface, text: note });
    if (!clean) return;
    if (!isNote && alreadyAnswered()) return;
    track("exit_feedback", { ...clean, note: isNote });
    markAnswered();
  };

  if (state === "hidden") return null;
  return (
    <div className="rounded-3xl border border-clay-100 bg-paper p-6 sm:p-8" data-testid={`exit-feedback-${surface}`}>
      {state === "thanked" ? (
        <p role="status" className="text-base font-medium text-sage-800">{THANKS}</p>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold text-ink-900">What&apos;s stopping you from trying it?</h2>
          <p className="mb-4 mt-1 text-sm text-ink-600">Pick whatever is closest. It shapes what gets built next.</p>
          <div className="flex flex-wrap gap-2">
            {EXIT_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  if (!reason) send(r.key, "", false);
                  setReason(r.key);
                }}
                aria-pressed={reason === r.key}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${reason === r.key ? "border-clay-600 bg-clay-700 text-paper" : "border-clay-200 bg-paper text-ink-700 hover:border-clay-400"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {reason && (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) send(reason, text, true);
                setState("thanked");
              }}
            >
              <label htmlFor={`exit-note-${surface}`} className="sr-only">Anything else? No children&apos;s names, please.</label>
              <input
                id={`exit-note-${surface}`}
                value={text}
                maxLength={EXIT_TEXT_MAX}
                onChange={(e) => setText(e.target.value)}
                placeholder="Anything else? (optional, no children's names)"
                className="input min-w-0 flex-1 text-sm"
              />
              <button type="submit" className="btn-secondary px-4 py-2 text-sm">{text.trim() ? "Send" : "Done"}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
