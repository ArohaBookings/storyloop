"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, HelpCircle, Printer, RotateCcw } from "lucide-react";
import { assessReadiness, QUESTIONS, type AnswerValue, type Answers } from "@/lib/review-readiness";

/**
 * Ten questions, answered in the browser. Nothing is sent anywhere: there is no
 * request to make, which is the honest reason this can be free and public with
 * no signup, and the reason a director can answer question two truthfully.
 */
export default function ReviewReadinessCheck() {
  const [answers, setAnswers] = useState<Answers>({});
  const result = useMemo(() => assessReadiness(answers), [answers]);
  const done = result.answered === result.total;

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="space-y-4">
        {QUESTIONS.map((question, index) => (
          <li key={question.id} className="card break-inside-avoid p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-ink-400 tabular-nums">{index + 1}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">{question.area}</p>
                <h3 className="mt-0.5 font-display text-lg font-bold leading-snug text-ink-900">{question.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{question.why}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 sm:pl-7">
              {question.options.map((option) => {
                const chosen = answers[question.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: current[question.id] === option.value ? undefined : (option.value as AnswerValue),
                      }))
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      chosen ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 text-ink-700 hover:border-clay-400"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <section id="readiness-result" className="card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="section-title mb-1">What your answers say</p>
            <h2 className="font-display text-2xl font-bold text-ink-900">
              {result.answered} of {result.total} answered
            </h2>
          </div>
          {result.answered > 0 && (
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
                <Printer className="h-4 w-4" /> Print this
              </button>
              <button type="button" onClick={() => setAnswers({})} className="btn-secondary text-sm">
                <RotateCcw className="h-4 w-4" /> Start again
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{result.summary}</p>

        {result.priorities.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display text-lg font-bold text-ink-900">Worth fixing, in this order</h3>
            <ol className="mt-2 space-y-3">
              {result.priorities.map((priority) => (
                <li key={priority.id} className="break-inside-avoid rounded-2xl border border-clay-300 bg-cream-50 p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-ink-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-clay-700" />
                    {priority.finding}
                  </p>
                  <p className="mt-1.5 pl-6 text-sm leading-relaxed text-ink-700">
                    <span className="text-ink-500">First move: </span>{priority.firstMove}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {result.unknowns.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display text-lg font-bold text-ink-900">You were not sure about</h3>
            <ul className="mt-2 space-y-1.5">
              {result.unknowns.map((question) => (
                <li key={question} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
                  <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-400" />
                  {question}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Not knowing is a finding of its own, and usually the cheapest one to fix. It means the answer exists somewhere
              in the service but not anywhere you can reach quickly.
            </p>
          </div>
        )}

        {result.solid.length > 0 && (
          <div className="mt-5">
            <h3 className="font-display text-lg font-bold text-ink-900">Already solid</h3>
            <ul className="mt-2 space-y-1.5">
              {result.solid.map((area) => (
                <li key={area} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sage-600" />
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
          This is your own self-check, not a rating and not a prediction of any assessment outcome. Nothing you answered
          left your browser. If it is useful, print it and take it to a staff meeting.
        </p>

        {done && (
          <div className="mt-5 rounded-2xl border border-clay-100 p-4 print:hidden">
            <p className="text-sm leading-relaxed text-ink-700">
              Most of what this asks about is countable, if the documentation is in one place. On a StoryLoop centre plan,
              the evidence pack counts coverage, closed next steps, reflection and family voice from stories your team
              already wrote, and names the gaps first.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/for-centres" className="btn-primary text-sm">What a centre plan includes</Link>
              <Link href="/assessment-and-rating-evidence" className="btn-secondary text-sm">The evidence guide</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
