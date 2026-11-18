"use client";
import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";
import { forgetKeptStatement, keptStatementText, keptStrategyLabel, readKeptStatement, type KeptStatement as Kept } from "@/lib/keep-story";

const ARRIVED_KEY = "storyloop_keep_statement_arrived";

/**
 * The statement or summary draft she wrote on a guide before signing up
 * (lib/keep-story.ts), shown once more at the top of /statement so nothing she
 * did before the account is lost. Statements are not saved in the app, so this
 * is the same draft, ready to copy, until she closes it or a week passes.
 * Nothing when there is no kept draft.
 */
export default function KeptStatement() {
  const [kept, setKept] = useState<Kept | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const found = readKeptStatement();
    if (!found) {
      forgetKeptStatement();
      return;
    }
    setKept(found);
    // Counted once per kept draft, not on every visit to the page.
    try {
      if (window.localStorage.getItem(ARRIVED_KEY) !== String(found.at)) {
        window.localStorage.setItem(ARRIVED_KEY, String(found.at));
        trackEvent("keep_story_arrived", { kind: found.mode === "summary" ? "summary" : "statement" });
      }
    } catch {
      /* the draft still shows */
    }
  }, []);

  if (!kept) return null;
  const label = keptStrategyLabel(kept.framework, kept.mode);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(keptStatementText(kept));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* she can still select the text */
    }
  };
  const close = () => {
    forgetKeptStatement();
    setKept(null);
  };

  return (
    <section className="mt-5 max-w-3xl rounded-3xl border border-sage-200 bg-sage-50/70 p-5" aria-labelledby="kept-statement-title" data-testid="kept-statement">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-56">
          <h2 id="kept-statement-title" className="font-display text-lg font-bold text-ink-900">
            The {kept.mode === "summary" ? "summary" : "statement"} you drafted before signing up
          </h2>
          <p className="mt-1 text-sm text-ink-600">Here it is, as you left it. Copy it before you close it: drafts are not saved.</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={copyAll} className="btn-ghost min-h-[44px] px-3 py-1 text-xs" data-track="kept_statement_copy">
            {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy all"}
          </button>
          <button type="button" onClick={close} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-500 hover:text-ink-900" aria-label="Close the kept draft" data-track="kept_statement_close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {kept.outcomes.map((o) => (
          <div key={o.outcome} className="rounded-2xl border border-clay-100 bg-paper p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-clay-700">{o.outcome}</p>
            {o.seen ? (
              <>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-800">{o.seen}</p>
                {o.strategy && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-800">
                    <span className="font-semibold text-sage-800">{label}:</span> {o.strategy}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-sm italic leading-relaxed text-ink-500">Not in your notes yet. {o.gap}</p>
            )}
          </div>
        ))}
        {kept.checks.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Check before you use it</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-800">
              {kept.checks.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
