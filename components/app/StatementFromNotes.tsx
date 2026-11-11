"use client";

import { useEffect, useState } from "react";
import { FileText, GraduationCap } from "lucide-react";
import TransitionDemo from "@/components/marketing/TransitionDemo";
import type { TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import { STATEMENT_FRAMEWORKS, frameworkForZone } from "@/lib/statement-from-notes";

const MODES: Array<[TransitionMode, string, typeof FileText]> = [
  ["transition", "Transition statement", GraduationCap],
  ["summary", "End-of-year summary", FileText],
];

/**
 * The signed-in door to the statement drafter: pick which document, type a
 * first name if you like, paste notes. The drafting box itself is the one on
 * the public guides (TransitionDemo), pointed at the account's own route.
 */
export default function StatementFromNotes() {
  const [mode, setMode] = useState<TransitionMode>("transition");
  const [framework, setFramework] = useState<TransitionFramework | null>(null);
  const [childName, setChildName] = useState("");

  // The time zone is only known in the browser, so the first curriculum is
  // chosen after the page loads (one frame), never guessed on the server.
  useEffect(() => {
    let zone = "";
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch { /* EYLF is the fallback */ }
    setFramework(frameworkForZone(zone));
  }, []);

  return (
    <div className="mt-6">
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
        // key: a new document type starts with an empty draft, never the last one relabelled.
        <TransitionDemo
          key={mode}
          framework={framework}
          mode={mode}
          choices={STATEMENT_FRAMEWORKS}
          endpoint="/api/statement-from-notes"
          inApp
          childName={childName}
        />
      )}
    </div>
  );
}
