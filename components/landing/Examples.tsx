import Link from "next/link";
import { ArrowRight, Check, HelpCircle, PenLine } from "lucide-react";
import DraftStory from "@/components/examples/DraftStory";
import { REAL_EXAMPLES } from "@/lib/real-examples";

/**
 * Two real notes and the drafts the production writer returned for them,
 * unedited (lib/real-examples.ts is generated from the story evaluation run).
 *
 * This section used to show a hand-written example in which the draft had the
 * child say "I did it by myself", words that were nowhere in the note. On the
 * page whose whole promise is that the child's words are never invented, that
 * was the worst possible example. Every quote here is marked only when it is in
 * the note, word for word, so a visitor can check.
 */
const HOMEPAGE = ["two-shoes-independence-nz", "four-long-rich-au"];

export default function Examples() {
  const examples = HOMEPAGE.map((slug) => REAL_EXAMPLES.find((example) => example.slug === slug)).filter(
    (example): example is (typeof REAL_EXAMPLES)[number] => Boolean(example),
  );

  return (
    <section id="examples" className="py-20 md:py-24">
      <div className="wide-shell">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            A two-year-old in Aotearoa. A four-year-old in Australia.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-600 md:text-lg">
            Real notes, and the drafts StoryLoop wrote from them, not a word changed. The{" "}
            <mark className="rounded bg-sage-100 px-1 font-semibold text-sage-900">highlighted words</mark> are the
            child&apos;s, exactly as the note has them.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {examples.map((example) => (
            <article key={example.slug} className="grid min-w-0 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
                <div className="card bg-cream-50 p-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                      <PenLine className="h-4 w-4 text-clay-700" /> The educator&apos;s note
                    </p>
                    <span className="rounded-full bg-clay-100 px-2.5 py-0.5 text-xs font-semibold text-clay-800">
                      {example.age}, {example.framework === "NZ" ? "Te Whāriki" : "EYLF"}
                    </span>
                  </div>
                  <p className="font-mono text-sm leading-relaxed text-ink-700">{example.note}</p>
                  <p className="mt-3 text-xs text-ink-500">{example.note.split(/\s+/).length} words</p>
                </div>
                <div className="rounded-2xl border border-sage-200 bg-sage-50/70 p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sage-700">Flagged for the educator to check</p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
                    {example.toCheck.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 flex-none text-clay-600" />{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="card min-w-0 border-l-4 border-clay-500 p-6 md:p-8">
                <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sage-700">
                  <Check className="h-4 w-4" /> The draft that came back, {example.words} words
                </p>
                <DraftStory story={example.story.split(/\n\s*What learning (?:we|I) noticed/i)[0]} note={example.note} />
                <details className="group mt-2">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
                    <span className="group-open:hidden">Show the learning, curriculum links and next steps</span>
                    <span className="hidden group-open:inline">Hide the rest of the draft</span>
                  </summary>
                  <DraftStory
                    story={`${example.title}\n${example.story.slice(example.story.search(/\n\s*What learning (?:we|I) noticed/i))}`}
                    note={example.note}
                    showTitle={false}
                    className="mt-4"
                  />
                </details>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-12">
          <Link href="/examples" className="inline-flex items-center gap-1.5 text-base font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
            All twelve examples, from babies to five-year-olds
            <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
