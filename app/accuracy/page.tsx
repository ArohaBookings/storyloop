import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical, ListChecks, Quote, Scale, ShieldCheck } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

export const metadata: Metadata = {
  title: { absolute: "How accurate are StoryLoop's learning story drafts?" },
  description:
    "How StoryLoop tests every learning story draft: 24 real-style notes, checked by rule and by an independent AI reviewer, with the latest results in full.",
  alternates: { canonical: "https://storyloop.space/accuracy" },
};

function longDate(iso: string) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

/**
 * The accuracy report. Generated numbers only (lib/accuracy-report.ts comes
 * from scripts/story-eval), and the weaknesses are stated as plainly as the
 * strengths: a report that only has good news is an advert, and educators can
 * tell the difference.
 */
export default function AccuracyPage() {
  const perDraft = (R.interpretationsAsFact / R.drafts).toFixed(1);
  const headline = [
    { value: `${R.drafts - R.wordsInChildMouth} of ${R.drafts}`, label: "drafts kept every child's quote word for word", note: "Every quote checked against the note, by rule" },
    { value: `${R.drafts - R.frameworkMixups} of ${R.drafts}`, label: "used the right framework for the country", note: "Te Whāriki in New Zealand, EYLF V2.0 in Australia" },
    { value: `${R.fidelity.toFixed(1)}/10`, label: "faithful to the educator's note", note: "Average, scored by an independent AI reviewer" },
    { value: perDraft, label: "interpretations written as if seen, per draft", note: "What we are fixing next. Details below." },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <PageTracker />
      <Navbar />
      <main>
        <section id="accuracy-hero" className="border-b border-clay-100 bg-cream-50 pb-14 pt-28 md:pb-20 md:pt-32">
          <div className="wide-shell">
            <p className="section-title mb-3">Accuracy report, {longDate(R.date)}</p>
            <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 text-balance md:text-6xl">
              How accurate are <span className="italic text-clay-700">StoryLoop&apos;s drafts?</span>
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-700">
              Before a change to how stories are written can ship, the same {R.notes} notes go through the real writer twice
              each, {R.drafts} drafts in all, and every draft is checked two ways. These are the latest results, including
              the part we are still working on.
            </p>
            <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {headline.map((item) => (
                <div key={item.label} className="rounded-3xl border border-clay-100 bg-paper p-6">
                  <dt className="sr-only">{item.label}</dt>
                  <dd>
                    <span className="block font-display text-4xl font-bold tabular-nums text-ink-900">{item.value}</span>
                    <span className="mt-1 block text-base font-semibold leading-snug text-ink-800">{item.label}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-ink-500">{item.note}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="how-we-test" className="py-16 md:py-20">
          <div className="wide-shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">How the test works</h2>
              <p className="mt-4 text-base leading-relaxed text-ink-600">
                The test is part of StoryLoop&apos;s code and anyone can read it:{" "}
                <a href="https://github.com/ArohaBookings/storyloop/tree/main/scripts/story-eval" className="font-semibold text-clay-700 underline" target="_blank" rel="noopener noreferrer">
                  scripts/story-eval
                </a>.
              </p>
            </div>
            <ol className="grid gap-5">
              {[
                { icon: FlaskConical, title: "The real writer, not a copy", body: `Each note goes through exactly the code an educator's note goes through, with every check and rewrite it normally gets. Nothing is saved. A draft takes a median of ${R.medianSeconds} seconds and runs to about ${Math.round(R.medianWords)} words.` },
                { icon: Quote, title: "Rules that cannot be argued with", body: "Every quoted phrase a child is shown saying must appear in the note, word for word. The framework must match the country. Every section an educator expects must be there." },
                { icon: Scale, title: "An independent reviewer", body: "A different AI model from the one that writes the stories reads each note and draft and lists anything stated as fact that the note does not support. Interpretation of learning (“this shows…”) is allowed; things presented as having happened are not." },
              ].map((step) => (
                <li key={step.title} className="flex gap-4 rounded-3xl border border-clay-100 bg-cream-50/60 p-6">
                  <step.icon className="mt-1 h-6 w-6 flex-none text-clay-700" strokeWidth={1.75} />
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink-900">{step.title}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-ink-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="still-fixing" className="border-y border-clay-100 bg-white py-16 md:py-20">
          <div className="wide-shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-title mb-3">What we are still fixing</p>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">Interpretation, written as if it were seen.</h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-ink-700">
              <p>
                In every draft, each child&apos;s quote matched the note word for word. The thing the reviewer flagged most is subtler:
                about {perDraft} times per draft, a sentence reads as something observed when it is really the writer&apos;s
                reading of the moment. These are the reviewer&apos;s own examples, word for word:
              </p>
              <ul className="space-y-2">
                {R.reviewerSamples.map((sample) => (
                  <li key={sample} className="rounded-xl border border-clay-100 bg-cream-50 px-4 py-2.5 font-display italic text-ink-800">
                    &ldquo;{sample}&rdquo;
                  </li>
                ))}
              </ul>
              <p>
                They are usually reasonable, and sometimes exactly what an educator would write. But they are yours to
                decide, which is why every draft comes with a list of what it assumed and what to check before sharing. It
                also reported {R.feelingsAsFact} feelings stated as fact across all {R.drafts} drafts, and{" "}
                {R.missingSections === 1 ? "one draft" : `${R.missingSections} drafts`} missing a section (a family link).
                The next change to how stories are written is aimed at these, and it will only ship if this test says it
                is better.
              </p>
            </div>
          </div>
        </section>

        <section id="by-age" className="py-16 md:py-20">
          <div className="wide-shell grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">By age</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-600">
                Fidelity to the note, averaged by the reviewer. Babies are the hardest: there is the least to go on, and
                the most temptation to fill the gaps.
              </p>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-clay-100">
                <table className="w-full min-w-[320px] text-left text-base">
                  <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
                    <tr><th className="px-4 py-3">Age</th><th className="px-4 py-3">Drafts</th><th className="px-4 py-3">Fidelity</th></tr>
                  </thead>
                  <tbody className="divide-y divide-clay-100">
                    {R.byAge.map((row) => (
                      <tr key={row.age}>
                        <td className="px-4 py-3 text-ink-800">{row.age}</td>
                        <td className="px-4 py-3 tabular-nums text-ink-700">{row.drafts}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-ink-900">{row.fidelity ?? "n/a"}/10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">The notes it is tested on</h2>
              <p className="mt-3 text-base leading-relaxed text-ink-600">
                Written the way educators really write: sloppy capitals, half sentences, other children&apos;s names, a
                child who never speaks, a scuffle over a scooter, a family going through a hard week.
              </p>
              <ul className="mt-6 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {R.cases.map((item, index) => (
                  <li key={index} className="flex gap-3 rounded-xl border border-clay-100 bg-cream-50/60 px-4 py-2.5 text-sm leading-relaxed text-ink-700">
                    <span className="flex-none font-semibold text-ink-900">{item.age}, {item.framework === "NZ" ? "NZ" : "AU"}</span>
                    <span>{item.tests}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="privacy" className="border-t border-clay-100 bg-cream-50/60 py-16">
          <div className="wide-shell grid gap-8 md:grid-cols-2">
            <div className="flex gap-4">
              <ShieldCheck className="mt-1 h-6 w-6 flex-none text-sage-700" strokeWidth={1.75} />
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">And children&apos;s information</h2>
                <p className="mt-2 text-base leading-relaxed text-ink-700">
                  Stored in Sydney. Never used to train AI, by us or by the AI providers under their business terms. First
                  names only. Every draft is checked for things that should not be shared, like another child&apos;s name
                  or a sensitive family detail. Nothing is shared until you choose to share it.
                </p>
                <Link href="/privacy" className="mt-3 inline-flex items-center gap-1.5 text-base font-semibold text-clay-700 underline">
                  The privacy policy, in plain words <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="flex gap-4">
              <ListChecks className="mt-1 h-6 w-6 flex-none text-clay-700" strokeWidth={1.75} />
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">See it on your own note</h2>
                <p className="mt-2 text-base leading-relaxed text-ink-700">
                  The fastest test is yours. Write three stories a month free, no card, and read what each draft says it
                  rests on. Unlimited plans start with a 7-day free trial.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="btn-primary">Start free</Link>
                  <Link href="/examples" className="btn-secondary">Read 12 real drafts</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
