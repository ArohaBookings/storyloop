import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import ExamplesBrowser from "@/components/examples/ExamplesBrowser";
import { REAL_EXAMPLES, REAL_EXAMPLES_DATE } from "@/lib/real-examples";

export const metadata: Metadata = {
  title: "Learning story examples: 12 real notes and drafts",
  description:
    "Twelve real educator notes, from babies to five-year-olds, and the unedited learning story drafts StoryLoop wrote from them, with Te Whāriki and EYLF links.",
  alternates: { canonical: "https://storyloop.space/examples" },
  openGraph: {
    title: "Learning story examples: 12 real notes and drafts",
    description: "Real notes and the unedited drafts StoryLoop wrote from them, from babies to five-year-olds.",
    url: "https://storyloop.space/examples",
    type: "website",
  },
};

function monthYear(iso: string) {
  return new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

export default function ExamplesPage() {
  const scores = REAL_EXAMPLES.map((example) => example.fidelity).filter((value): value is number => typeof value === "number");
  const fidelity = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  const shortestNote = Math.min(...REAL_EXAMPLES.map((example) => example.note.split(/\s+/).length));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Learning story examples",
    description: "Real educator notes and the unedited learning story drafts written from them.",
    itemListElement: REAL_EXAMPLES.map((example, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: example.title,
      url: `https://storyloop.space/examples#${example.slug}`,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageTracker />
      <Navbar />
      <main>
        <section id="examples-hero" className="border-b border-clay-100 bg-cream-50 pb-14 pt-28 md:pb-20 md:pt-32">
          <div className="wide-shell grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="section-title mb-3">Examples</p>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 text-balance md:text-6xl">
                Twelve real notes. <span className="italic text-clay-700">Twelve real drafts.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700">
                Every draft below is exactly what StoryLoop wrote for the note beside it, in {monthYear(REAL_EXAMPLES_DATE)}.
                Nothing is tidied afterwards. We chose these twelve to cover every age and both countries; how often
                drafts go wrong, including the ones not shown here, is in the{" "}
                <Link href="/accuracy" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">accuracy report</Link>.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/#live-demo" className="btn-primary px-7 py-3.5 text-base">
                  <Sparkles className="h-4 w-4" /> Try it with your own note
                </Link>
                <Link href="/signup" className="btn-secondary px-7 py-3.5 text-base">Start free</Link>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { value: "12", label: "notes, from babies to five-year-olds" },
                { value: `${shortestNote}`, label: "words in the shortest note" },
                { value: "2", label: "frameworks: Te Whāriki and EYLF V2.0" },
                { value: fidelity ? `${fidelity}/10` : "n/a", label: "average fidelity to the note, scored by an independent AI reviewer" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-clay-100 bg-paper p-4">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-3xl font-bold tabular-nums text-ink-900">{stat.value}</span>
                    <span className="mt-1 block text-sm leading-snug text-ink-600">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="all-examples" className="py-12 md:py-16">
          <div className="wide-shell">
            <p className="mb-6 max-w-3xl text-base leading-relaxed text-ink-600">
              In each draft, the{" "}
              <mark className="rounded bg-sage-100 px-1 font-semibold text-sage-900">highlighted words</mark> are the
              child&apos;s, word for word from the note. Beside each note: the lines the draft rests on, and what StoryLoop
              flagged for the educator to check before sharing.
            </p>
            <ExamplesBrowser examples={REAL_EXAMPLES} />
          </div>
        </section>

        <section id="what-to-notice" className="border-y border-clay-100 bg-white py-16">
          <div className="wide-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-title mb-3">What to notice</p>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">Read the gaps as carefully as the writing.</h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-ink-700">
              <p>
                <strong className="text-ink-900">Sophie&apos;s note is 24 words</strong> and says she asked what a word
                spells, without her exact words. The draft says she asked, and does not make up what she said. Then it
                flags it: no direct wording from Sophie was recorded.
              </p>
              <p>
                <strong className="text-ink-900">Mere is eight months old.</strong> The note has her babbling
                &ldquo;ba ba&rdquo;, and that is all the draft gives her to say. Everything else is what she did.
              </p>
              <p>
                <strong className="text-ink-900">Three children built the hut.</strong> The story is Tui&apos;s, and
                Sam&apos;s &ldquo;banana&rdquo; stays his. The draft asks whether Rawiri and Sam can be named under your
                centre&apos;s privacy practice before it is shared with Tui&apos;s family.
              </p>
              <p>
                <strong className="text-ink-900">Aroha said &ldquo;help me&rdquo;</strong>, then pushed the hand away and
                did the second shoe herself. The draft keeps both, because both are the learning, and checks the exact
                wording with you.
              </p>
              <p>
                You still read every draft and change whatever is not right. The point is that you are editing something
                true, rather than facing a blank page at eight in the evening.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-50 via-white to-sage-50 p-8 text-center md:p-12">
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">Try it with a note of your own.</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-600">
                Paste something you wrote this week, however rough. Three stories a month are free with no card, and
                unlimited plans start with a 7-day free trial.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary">
                  <Sparkles className="h-4 w-4" /> Start free
                </Link>
                <Link href="/accuracy" className="btn-secondary">
                  How we test accuracy <ArrowRight className="h-4 w-4" />
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
