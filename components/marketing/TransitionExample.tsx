import { ArrowDown } from "lucide-react";
import type { TransitionFramework } from "@/lib/ai/transition-draft";
import { TRANSITION_EXAMPLES, TRANSITION_EXAMPLE_NOTES } from "@/lib/transition-examples";

/**
 * A worked example on the statement guides, above the box where the reader
 * drafts their own (11 Nov 2026).
 *
 * Why. In the 36 hours to 11 Nov, 43 search visitors landed on these guides,
 * stayed a median of 8 to 30 seconds, and none of them touched the drafter.
 * They searched for an example and were shown an empty box. Search Console
 * says the same from the other side: "examples" searches earn the clicks.
 * So the page now shows one, finished, before it asks for anything.
 *
 * The draft is exactly what the production drafter wrote for these notes
 * (lib/transition-examples.ts, generated, never edited), and the child is
 * made up. Both are said on the page.
 */
const STRATEGY: Record<TransitionFramework, string> = {
  VEYLDF: "Strategy for the Prep teacher",
  EYLF: "Strategy for the school teacher",
  QKLG: "Suggestion for continuity",
  TW: "Strategy for the new entrant teacher",
};

function Outcome({ framework, outcome }: { framework: TransitionFramework; outcome: { outcome: string; seen: string; strategy: string; gap: string } }) {
  return (
    <div className="rounded-2xl border border-clay-100 bg-paper p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-clay-700">{outcome.outcome}</h3>
      {outcome.seen ? (
        <>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-800">{outcome.seen}</p>
          {outcome.strategy && (
            <p className="mt-2 text-[15px] leading-relaxed text-ink-800">
              <span className="font-semibold text-sage-800">{STRATEGY[framework]}:</span> {outcome.strategy}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-sm italic leading-relaxed text-ink-500">Not in the notes. {outcome.gap}</p>
      )}
    </div>
  );
}

export default function TransitionExample({ framework }: { framework: TransitionFramework }) {
  const example = TRANSITION_EXAMPLES[framework];
  if (!example) return null;
  const [first, second, ...rest] = example.outcomes;
  return (
    <section id="transition-example" aria-labelledby="transition-example-title" className="scroll-mt-24 border-t border-clay-100 bg-cream-50 py-12 md:py-16" data-testid="transition-example">
      <div className="wide-shell">
        <div className="max-w-3xl">
          <p className="section-title mb-3">A worked example</p>
          <h2 id="transition-example-title" className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            Six lines of notes in. A statement draft out.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600 md:text-lg">
            The notes are about a made-up child. The draft is exactly what StoryLoop wrote from them, not edited: every line traces back to
            the notes, and it lists what to check before you use it.
          </p>
        </div>
        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="card-warm min-w-0 p-5 sm:p-6">
            <p className="section-title">The notes</p>
            <p className="mt-3 font-mono text-[14px] leading-relaxed text-ink-800">{TRANSITION_EXAMPLE_NOTES}</p>
          </div>
          <div className="card-warm min-w-0 p-5 sm:p-6">
            <p className="section-title">The draft, outcome by outcome</p>
            <div className="mt-3 space-y-3">
              {first && <Outcome framework={framework} outcome={first} />}
              {second && <Outcome framework={framework} outcome={second} />}
              {rest.length > 0 && (
                <details className="group">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-sm font-bold text-clay-700 [&::-webkit-details-marker]:hidden" data-track="transition_example_more">
                    <ArrowDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    <span className="group-open:hidden">Show the other {rest.length} outcomes and the checks</span>
                    <span className="hidden group-open:inline">Hide them</span>
                  </summary>
                  <div className="mt-1 space-y-3">
                    {rest.map((outcome) => <Outcome key={outcome.outcome} framework={framework} outcome={outcome} />)}
                    {example.checks.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Check before you use it</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-ink-800">
                          {example.checks.map((check) => <li key={check}>• {check}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
            <a href="#transition-try" className="btn-primary mt-5 w-full justify-center text-sm sm:w-auto" data-track="transition_example_try">
              Draft one from my notes, no signup
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
