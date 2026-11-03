"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
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

function Question({ surface, onDone }: { surface: ExitSurface; onDone: () => void }) {
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [text, setText] = useState("");

  // The first tap is the answer and is counted once per visit, even when both
  // the card and the pop-up are on screen; a typed note follows as its own
  // event (note: true), so reasons are counted from the taps alone.
  const send = (picked: ExitReason, note: string, isNote: boolean) => {
    const clean = cleanExitFeedback({ reason: picked, surface, text: note });
    if (!clean) return;
    if (!isNote && alreadyAnswered()) return;
    track("exit_feedback", { ...clean, note: isNote });
    markAnswered();
  };

  return (
    <div className="space-y-3">
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
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${reason === r.key ? "border-clay-600 bg-clay-700 text-paper" : "border-clay-200 bg-paper text-ink-700 hover:border-clay-400"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {reason && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send(reason, text, true);
            onDone();
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
          <button type="submit" className="btn-secondary px-4 py-2 text-xs">{text.trim() ? "Send" : "Done"}</button>
        </form>
      )}
    </div>
  );
}

const THANKS = "Thank you. Leo reads every one of these.";

/**
 * A one-tap "why not today?" for real visitors (lib/exit-feedback.ts).
 * Inline where people decide (under the homepage demo, at the foot of a guide,
 * under the signup form). On a computer it also asks once, quietly, when the
 * pointer heads for the tab bar after a real look at the page. Answered once,
 * it says thank you and stays out of the way for the rest of the visit.
 */
export default function ExitFeedback({ surface, intent = false }: { surface: ExitSurface; intent?: boolean }) {
  // "hidden": answered on an earlier page this visit. "thanked": answered here.
  const [state, setState] = useState<"open" | "thanked" | "hidden">("open");
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    if (alreadyAnswered()) {
      setState("hidden");
      return;
    }
    if (!intent) return;
    const started = Date.now();
    const onLeave = (event: MouseEvent) => {
      if (event.clientY > 0 || Date.now() - started < 12_000 || alreadyAnswered()) return;
      if (window.matchMedia("(pointer: coarse)").matches) return;
      setFloating(true);
      document.removeEventListener("mouseout", onLeave);
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [intent]);

  const thank = () => {
    setState("thanked");
    window.setTimeout(() => setFloating(false), 2500);
  };
  // Closing the pop-up after a tap still counts the tap; the card then just says thanks.
  const close = () => {
    setFloating(false);
    if (alreadyAnswered()) setState("thanked");
  };

  // Signup keeps its "Tell us why" opener, so it says so rather than opening on nothing.
  if (state === "hidden") return surface === "signup" ? <p className="text-center text-xs text-ink-500">You already told us why today. Thank you.</p> : null;
  return (
    <>
      <div className="rounded-2xl border border-clay-100 bg-paper/80 p-4 sm:p-5" data-testid={`exit-feedback-${surface}`}>
        {state === "thanked" ? (
          <p role="status" className="text-sm font-medium text-sage-800">{THANKS}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink-900">Not for you today? One tap tells us why.</p>
            <p className="mb-3 mt-0.5 text-xs text-ink-500">It shapes what gets built next.</p>
            <Question surface={surface} onDone={thank} />
          </>
        )}
      </div>
      {floating && (
        <div role="dialog" aria-label="Before you go" className="fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-clay-200 bg-paper p-5 shadow-warm">
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-ink-900">{state === "thanked" ? THANKS : "Before you go: what stopped you today?"}</p>
            <button type="button" onClick={close} className="flex-none text-ink-500 hover:text-ink-900" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          {state !== "thanked" && <Question surface={surface} onDone={thank} />}
        </div>
      )}
    </>
  );
}
