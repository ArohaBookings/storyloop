import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PenLine, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import { STORY_EXAMPLES } from "@/lib/story-examples";

export const metadata: Metadata = {
  title: "Learning story examples: rough notes turned into finished drafts | StoryLoop",
  description:
    "Real before and after examples of early childhood learning stories. See exactly what a scribbled note becomes, with Te Whariki and EYLF links, dispositions and next steps.",
  alternates: { canonical: "https://storyloop.space/examples" },
  openGraph: {
    title: "Learning story examples: rough notes turned into finished drafts",
    description: "See exactly what a scribbled observation becomes as a finished learning story draft.",
    url: "https://storyloop.space/examples",
    type: "website",
  },
};

export default function ExamplesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Learning story examples",
    description: "Before and after examples of early childhood learning stories written from rough educator notes.",
    itemListElement: STORY_EXAMPLES.map((example, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: example.storyTitle,
      description: example.learningSummary,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageTracker />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="border-b border-clay-100 bg-cream-50 py-16 md:py-24">
          <div className="wide-shell text-center">
            <p className="section-title mb-3">Examples</p>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight text-ink-900 md:text-6xl">
              This is what a scribbled note actually becomes.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Not polished sample notes written to make a product look good. These are the kind of half sentences
              educators really thumb into a phone while kneeling on a mat, and the drafts that come back from them.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary">
                <Sparkles className="h-4 w-4" /> Try it with your own note
              </Link>
              <Link href="/#live-demo" className="btn-secondary">See the live demo</Link>
            </div>
          </div>
        </section>

        {/* Examples */}
        <section className="py-16 md:py-20">
          <div className="wide-shell space-y-16">
            {STORY_EXAMPLES.map((example, index) => (
              <article key={example.slug} className="scroll-mt-24" id={example.slug}>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-clay-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">
                    Example {index + 1}
                  </span>
                  <span className="text-sm text-ink-500">
                    {example.childName}, {example.ageGroup} · {example.setting} ·{" "}
                    {example.framework === "NZ" ? "Te Whāriki" : "EYLF"}
                  </span>
                </div>

                <div className="grid min-w-0 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                  {/* The note */}
                  <div className="min-w-0">
                    <div className="card h-full min-w-0 border-clay-200 bg-cream-50 p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-clay-700" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-clay-700">
                          What the educator wrote
                        </p>
                      </div>
                      <p className="font-mono text-sm leading-relaxed text-ink-700">{example.note}</p>
                      <p className="mt-5 border-t border-clay-200 pt-4 text-xs leading-relaxed text-ink-500">
                        {example.note.trim().split(/\s+/).length} words. No punctuation to speak of. This is a
                        realistic starting point, not a tidy one.
                      </p>
                    </div>
                  </div>

                  {/* The draft */}
                  <div className="min-w-0">
                    <div className="card min-w-0 p-6 md:p-8">
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sage-700" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-sage-700">
                          The draft that comes back
                        </p>
                      </div>
                      <h2 className="font-display text-2xl font-bold text-ink-900">{example.storyTitle}</h2>
                      <div className="story-safe mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">
                        {example.story}
                      </div>

                      <div className="mt-6 grid gap-4 border-t border-clay-100 pt-5 sm:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                            Dispositions noticed
                          </p>
                          <ul className="space-y-1 text-xs text-ink-600">
                            {example.dispositions.map((item) => <li key={item}>• {item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                            Where to next
                          </p>
                          <ul className="space-y-1.5 text-xs leading-relaxed text-ink-600">
                            {example.nextSteps.map((item) => <li key={item}>• {item}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-sage-700">
                          Question for {example.framework === "NZ" ? "whānau" : "family"}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-700">{example.familyQuestion}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* What to notice */}
        <section className="border-y border-clay-100 bg-white py-16">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl">
              <p className="section-title mb-3">What to notice in these</p>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                Read the gaps as carefully as the writing.
              </h2>
              <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-600">
                <p>
                  Look at the Tane example. The note says he would not share, and then he did, and it says nothing
                  about what happened in between. The draft does not fill that in. It says plainly that we do not
                  know whether an adult stepped in, and it puts that question to the educator instead of inventing
                  a tidy answer.
                </p>
                <p>
                  That is the part most people do not expect. It would be easy to write a lovely paragraph about
                  Tane generously deciding to include his friend, and it would read beautifully, and it might be
                  completely false. Documentation that invents the bits it does not know is worse than useless,
                  because someone will make a judgement about a child based on it.
                </p>
                <p>
                  Look at Sophie too. A child who sat alone all morning could easily be written up as a concern.
                  The draft refuses to do that. It treats her choice as a choice, records the genuine strength in
                  it, and notes that one morning is not a pattern.
                </p>
                <p>
                  And in the Harry example, the only real detail in the note is that he pushed himself rather than
                  being pushed. The whole story hangs off that one fact, because that one fact is what makes it
                  about him rather than about a swing.
                </p>
                <p>
                  You still read every draft, and you still change whatever is not right. The point is that you
                  are editing something rather than facing a blank page at eight in the evening.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-50 via-white to-sage-50 p-8 text-center md:p-12">
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                Try it with a note of your own.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-600">
                Paste something you actually wrote this week, however rough. Three stories free, no credit card.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary">
                  <Sparkles className="h-4 w-4" /> Start free
                </Link>
                <Link href="/blog" className="btn-secondary">
                  Read the guides <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
