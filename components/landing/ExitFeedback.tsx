"use client";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/client";
import { trackEvent } from "@/lib/analytics/track-event";
import { EXIT_REASONS, EXIT_SURFACE_PATH, EXIT_TEXT_MAX, cleanExitFeedback, shouldShowExitQuestion, type ExitReason, type ExitSurface } from "@/lib/exit-feedback";

const ASKED_KEY = "storyloop_exit_asked";
// Once per visitor (18 Nov 2026): the page it was first shown on, kept in this browser.
const SEEN_KEY = "storyloop_exit_seen_on";
const ANSWERED_KEY = "storyloop_exit_answered";
const SEEN_VISIT_KEY = "storyloop_exit_seen_visit";

function readSeen(): { seenOn: string | null; answered: boolean; seenThisVisit: boolean } {
  let seenThisVisit = false;
  try {
    seenThisVisit = window.sessionStorage.getItem(SEEN_VISIT_KEY) === "1";
  } catch {
    /* fine */
  }
  try {
    return { seenOn: window.localStorage.getItem(SEEN_KEY), answered: window.localStorage.getItem(ANSWERED_KEY) === "1", seenThisVisit };
  } catch {
    return { seenOn: null, answered: false, seenThisVisit };
  }
}
function remember(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* fine */
  }
}

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
  remember(ANSWERED_KEY, "1");
}

const THANKS = "Thank you. Leo reads every one of these.";

/**
 * "What's stopping you?" (lib/exit-feedback.ts). Leo, 3 Nov 2026: a good idea,
 * but not on the homepage, the guides or signup, and no pop-up. It sits in the
 * page, quietly, on /about, /pricing, /features and /for-centres, and a visitor
 * is asked once: on the first of those pages where she scrolls to it.
 *
 * The first tap is the answer and is counted once. On /about only, a typed note
 * may follow as its own event (note: true), as it has since 3 Nov; the other
 * pages are one tap, so their events carry a listed reason and nothing typed.
 */
export default function ExitFeedback({ surface }: { surface: ExitSurface }) {
  const [state, setState] = useState<"open" | "thanked" | "hidden">("hidden");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const page = EXIT_SURFACE_PATH[surface];
  const allowNote = surface === "about";

  useEffect(() => {
    const { seenOn, answered, seenThisVisit } = readSeen();
    if (alreadyAnswered() || !shouldShowExitQuestion(seenOn, answered, surface, seenThisVisit)) return;
    setState("open");
  }, [surface]);

  // Counted as shown, and the visitor marked as asked, only once it is actually on screen.
  useEffect(() => {
    if (state !== "open" || !box.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      if (!readSeen().seenOn) {
        remember(SEEN_KEY, surface);
        try {
          window.sessionStorage.setItem(SEEN_VISIT_KEY, "1");
        } catch {
          /* fine */
        }
        trackEvent("exit_question_shown", { page });
      }
    }, { threshold: 0.5 });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [state, surface, page]);

  const send = (picked: ExitReason, note: string, isNote: boolean) => {
    const clean = cleanExitFeedback({ reason: picked, surface, text: allowNote ? note : "" });
    if (!clean) return;
    if (!isNote && alreadyAnswered()) return;
    track("exit_feedback", { ...clean, note: isNote });
    if (!isNote) trackEvent("exit_question_answered", { page, reason: picked });
    markAnswered();
  };

  if (state === "hidden") return null;
  return (
    <div ref={box} className="rounded-3xl border border-clay-100 bg-paper p-6 sm:p-8" data-testid={`exit-feedback-${surface}`}>
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
                  // One tap is the whole answer outside /about.
                  if (!allowNote) setState("thanked");
                }}
                aria-pressed={reason === r.key}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${reason === r.key ? "border-clay-600 bg-clay-700 text-paper" : "border-clay-200 bg-paper text-ink-700 hover:border-clay-400"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {reason && allowNote && (
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
