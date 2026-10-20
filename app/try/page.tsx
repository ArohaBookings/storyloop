import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import StoryDemo from "@/components/landing/StoryDemo";
import PrintableCard from "@/components/marketing/PrintableCard";
import { draftOpening, proofExample } from "@/lib/guide-proof";
import { PRINTABLE_FRAMEWORK, isPrintableKey } from "@/lib/printables";

/**
 * /try: the demo first, for people who arrive from a post, a printable or a
 * QR code (19 Oct 2026).
 *
 * Why it exists: from 22 Sep to 19 Oct, 232 Facebook visitors landed on guide
 * pages and none signed up or tried the demo, while Facebook visitors who
 * landed on the homepage signed up at about 7% in August. Value posts promise
 * a free printable, so this page hands it over, then puts "type your own note"
 * straight underneath instead of several screens down a guide. The printables
 * themselves now link and QR-code here (/p/<sheet>), so a downloaded or
 * printed sheet leads back to the demo.
 *
 * Not indexed: it is a landing for links we share, and the guides and
 * /learning-story-generator already answer the searches.
 */
export const metadata: Metadata = {
  title: { absolute: "Try StoryLoop free: a learning story from your own note" },
  description:
    "Type what a child did. StoryLoop drafts the learning story with Te Whāriki or EYLF V2.0 links in about a minute. No signup to try.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/try" },
};

const CURRICULUM = { NZ: "Te Whāriki", AU: "EYLF V2.0", UK: "EYFS", IE: "Aistear" } as const;

export default async function TryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const raw = Array.isArray(query.sheet) ? query.sheet[0] : query.sheet;
  const sheet = isPrintableKey(raw) ? raw : null;
  const framework = sheet ? PRINTABLE_FRAMEWORK[sheet] : undefined;
  const curriculum = framework ? CURRICULUM[framework] : "Te Whāriki or EYLF V2.0";
  // The real examples are Te Whāriki and EYLF drafts; an England or Ireland
  // sheet promises EYFS or Aistear, so it gets no example rather than the wrong one.
  const example = framework === "UK" || framework === "IE" ? null : proofExample(framework === "NZ" ? "NZ" : "AU");
  const draft = example ? draftOpening(example.story).slice(0, 2) : [];

  return (
    <div className="min-h-screen bg-paper">
      <PageTracker />
      <Navbar />
      <main className="pt-24 md:pt-28">
        <section className="paper-texture pb-10">
          <div className="wide-shell">
            <p className="section-title mb-3">Free · no signup to try</p>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 text-balance md:text-5xl">
              Turn today&apos;s note into a learning story.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-700">
              Type what a child did, in your own words. StoryLoop drafts the learning story with {curriculum} links in about a
              minute, and you check every word.
            </p>

            {sheet && (
              <div className="mt-6 max-w-xl">
                <PrintableCard which={sheet} compact />
              </div>
            )}

            <div id="try" className="mt-8 scroll-mt-24">
              <StoryDemo surface="guide" framework={framework} />
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                Use a first name or initial only. Demo notes are not saved to any account and are never used to train AI.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup" className="btn-secondary justify-center" data-track="try_start_free">
                Keep your drafts: start free
              </Link>
              <p className="text-sm text-ink-600">
                3 stories a month, no card.{" "}
                <Link href="/login" className="font-semibold text-clay-700 underline underline-offset-2" data-track="try_sign_in">
                  Already use StoryLoop? Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>

        {example && (
          <section aria-labelledby="real-example" className="border-y border-clay-100 bg-white py-12">
            <div className="wide-shell">
              <h2 id="real-example" className="font-display text-2xl font-bold text-ink-900 md:text-3xl">
                What a real note turned into
              </h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                <figure className="rounded-3xl border border-clay-200 bg-cream-50 p-5">
                  <figcaption className="text-xs font-bold uppercase tracking-wider text-ink-500">
                    The note · {example.childName}, {example.age.toLowerCase()}
                  </figcaption>
                  <blockquote className="mt-3 font-mono text-[15px] leading-relaxed text-ink-800">{example.note}</blockquote>
                </figure>
                <figure className="rounded-3xl border border-sage-200 bg-paper p-5">
                  <figcaption className="text-xs font-bold uppercase tracking-wider text-sage-700">The draft, unedited</figcaption>
                  <p className="mt-3 font-display text-xl font-bold text-ink-900">{example.title}</p>
                  <div className="mt-2 space-y-3 text-base leading-relaxed text-ink-700">
                    {draft.map((part) => (
                      <div key={part.text}>
                        {part.heading && <p className="font-semibold text-ink-900">{part.heading}</p>}
                        <p>{part.text}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/examples#${example.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4"
                    data-track="try_full_draft"
                  >
                    Read the full draft <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </figure>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
