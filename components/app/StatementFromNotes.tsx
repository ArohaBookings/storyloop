"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, GraduationCap } from "lucide-react";
import TransitionDemo from "@/components/marketing/TransitionDemo";
import AppLimitWall from "@/components/app/AppLimitWall";
import CheckoutReturn from "@/components/app/CheckoutReturn";
import type { TransitionDraft, TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import { STATEMENT_FRAMEWORKS, frameworkForZone } from "@/lib/statement-from-notes";
import { keepWallWork, takeWallWork } from "@/lib/app-wall";

const MODES: Array<[TransitionMode, string, typeof FileText]> = [
  ["transition", "Transition statement", GraduationCap],
  ["summary", "End-of-year summary", FileText],
];

/**
 * The signed-in door to the statement drafter: pick which document, type a
 * first name if you like, paste notes. The drafting box itself is the one on
 * the public guides (TransitionDemo), pointed at the account's own route.
 *
 * A whole class in one sitting (12 Nov 2026): "Next child" beside Copy all
 * empties the notes, the name and the draft, keeps the document and the
 * curriculum, and puts the cursor back in the notes.
 */
export default function StatementFromNotes({ freePlan = false }: { freePlan?: boolean }) {
  const [mode, setMode] = useState<TransitionMode>("transition");
  const [framework, setFramework] = useState<TransitionFramework | null>(null);
  const [childName, setChildName] = useState("");
  // Back from a wall's checkout (lib/app-wall.ts): her notes and draft, put back.
  const [returned, setReturned] = useState<{ status: "upgraded" | "cancelled"; plan: string | null; sessionId: string | null } | null>(null);
  const [kept, setKept] = useState<{ notes: string; draft: TransitionDraft | null } | null>(null);
  const [paidNow, setPaidNow] = useState(false);

  // The time zone is only known in the browser, so the first curriculum is
  // chosen after the page loads (one frame), never guessed on the server.
  useEffect(() => {
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch { /* EYLF is the fallback */ }
    let start = frameworkForZone(zone);
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded") === "true";
    if (upgraded || params.get("checkout") === "cancelled") {
      setReturned({ status: upgraded ? "upgraded" : "cancelled", plan: params.get("plan"), sessionId: params.get("session_id") });
      const work = takeWallWork("/statement");
      if (work) {
        const keptFramework = STATEMENT_FRAMEWORKS.find((choice) => choice === work.framework);
        if (keptFramework) start = keptFramework;
        if (work.mode === "transition" || work.mode === "summary") setMode(work.mode);
        setKept({ notes: work.note, draft: (work.draft as TransitionDraft | null) ?? null });
      }
      window.history.replaceState(null, "", "/statement");
    }
    setFramework(start);
  }, []);

  return (
    <div className="mt-6">
      {returned && (
        <div className="mb-4">
          <CheckoutReturn status={returned.status} plan={returned.plan} sessionId={returned.sessionId} onPlan={() => setPaidNow(true)} />
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex w-full rounded-2xl border border-clay-200 bg-white p-1 shadow-soft sm:w-fit" role="group" aria-label="What to draft">
          {MODES.map(([option, label, Icon]) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              data-testid={`statement-mode-${option}`}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
                mode === option ? "bg-clay-700 text-paper shadow-warm" : "text-ink-600 hover:bg-cream-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor="statement-child" className="section-title">Child&apos;s first name (optional)</label>
          <input
            id="statement-child"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            maxLength={30}
            autoComplete="off"
            className="input mt-2"
            placeholder="First name only"
          />
        </div>
      </div>
      {framework && (
        // No key: switching the document type keeps the pasted notes. A draft on
        // screen keeps its own labels (TransitionDemo reads them from draft.mode).
        <TransitionDemo
          framework={framework}
          mode={mode}
          choices={STATEMENT_FRAMEWORKS}
          endpoint="/api/statement-from-notes"
          inApp
          childName={childName}
          onNextChild={() => setChildName("")}
          initialNotes={kept?.notes}
          initialDraft={kept?.draft}
          renderLimitWall={(work) => (
            <AppLimitWall
              wall="statement"
              returnTo="/statement"
              heading={work.limit === "day" ? "You've used today's free drafts." : "You've used this hour's free drafts."}
              line={`Your notes are still here. Try again ${work.limit === "day" ? "tomorrow" : "in an hour"}, or keep going now: Educator covers as many as you need.`}
              onBeforeCheckout={() => keepWallWork({ page: "/statement", note: work.notes, storyId: null, draft: work.draft, framework: work.framework, mode: work.mode })}
              onDismiss={work.dismiss}
            />
          )}
          allowanceNote={
            freePlan && !paidNow ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-500" data-testid="statement-free-line">
                Free plan: three drafts an hour. Educator covers as many as you need.{" "}
                <Link href="/billing" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2" data-track="statement_free_line_billing">
                  See the plans
                </Link>
              </p>
            ) : null
          }
        />
      )}
    </div>
  );
}
