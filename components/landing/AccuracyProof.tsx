import Link from "next/link";
import { ArrowRight, ListChecks, Quote, ScanSearch } from "lucide-react";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

/**
 * The answer to the objection a 120-visitor panel raised more than any other:
 * "will it make things up, and will I spend as long checking it as writing it?"
 * Mechanisms first, then the tested numbers, then the honest weakness, with the
 * full report one click away. The numbers come from the same generated file as
 * /accuracy, so the homepage can never claim more than the report shows.
 */
export default function AccuracyProof() {
  return (
    <section id="accuracy" className="border-y border-clay-100 bg-white py-20 md:py-24">
      <div className="wide-shell grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            Built so it cannot put words in a child&apos;s mouth.
          </h2>
          <ul className="mt-8 grid gap-6">
            {[
              { icon: Quote, title: "Their words, checked", body: `Quotes are checked against your note before you see the draft. In testing, not one of ${R.drafts} drafts gave a child words they did not say.` },
              { icon: ScanSearch, title: "Every draft shows its working", body: "What it took straight from your note, and what it assumed. You see both before you share anything." },
              { icon: ListChecks, title: "Tested before every change", body: `The same ${R.notes} notes, ${R.drafts} drafts, checked by rule and by an independent AI reviewer. Nothing ships if it gets worse.` },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sage-50 text-sage-700">
                  <item.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-1 text-base leading-relaxed text-ink-600">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-clay-200 bg-cream-50 p-7 md:p-8">
          <p className="text-sm font-semibold text-ink-500">Latest accuracy test</p>
          <dl className="mt-4 divide-y divide-clay-200">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-base text-ink-700">Drafts that put words in a child&apos;s mouth</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-ink-900">{R.wordsInChildMouth} of {R.drafts}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-base text-ink-700">Framework mix-ups</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-ink-900">{R.frameworkMixups}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-base text-ink-700">Fidelity to the note</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-ink-900">{R.fidelity.toFixed(1)}/10</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Anything a draft had to assume is listed for you to check before you share it. The report shows every
            result, including what we are still improving.
          </p>
          <Link href="/accuracy" className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
            Read the full accuracy report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
