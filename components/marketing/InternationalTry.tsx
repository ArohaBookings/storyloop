import Link from "next/link";
import StoryDemo from "@/components/landing/StoryDemo";
import { draftOpening } from "@/lib/guide-proof";
import { INTERNATIONAL_EXAMPLES } from "@/lib/international-examples";

/**
 * The England (EYFS) and Ireland (Aistear) guides' proof and demo, 13 Oct 2026.
 * Like GuideProof for AU and NZ: a note and the draft StoryLoop actually wrote
 * from it, unedited, then the "try your own note" demo in the page's own
 * curriculum. The notes are ours, written to test the writer, and say so.
 */
export default function InternationalTry({ framework }: { framework: "UK" | "IE" }) {
  const curriculum = framework === "UK" ? "EYFS" : "Aistear";
  const settingWord = framework === "UK" ? "practitioner" : "educator";
  const example = INTERNATIONAL_EXAMPLES[framework];
  const opening = draftOpening(example.story);
  const rest = example.story.split(/\n\s*\n/).slice(1).join("\n\n").replace(/^Learning Story\s*\n?/i, "");
  const written = new Date(`${example.writtenOn}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section id="try" aria-labelledby="try-title" className="scroll-mt-24 border-y border-clay-100 bg-white py-12 md:py-16">
      <div className="wide-shell">
        <div className="max-w-3xl">
          <p className="section-title mb-3">What StoryLoop does with a note</p>
          <h2 id="try-title" className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            A rough note in, a {curriculum} draft out.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600 md:text-lg">
            A note we wrote to test it on {written}, not about a real child, and the draft StoryLoop wrote from it, unedited, with
            its {curriculum} links.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <figure className="rounded-3xl border border-clay-200 bg-cream-50 p-5 md:p-6">
            <figcaption className="text-xs font-bold uppercase tracking-wider text-ink-500">
              The note · {example.childName}, {example.age}
            </figcaption>
            <blockquote className="mt-3 font-mono text-[15px] leading-relaxed text-ink-800">{example.note}</blockquote>
          </figure>
          <figure className="min-w-0 rounded-3xl border border-sage-200 bg-paper p-5 md:p-6">
            <figcaption className="text-xs font-bold uppercase tracking-wider text-sage-700">The draft, as StoryLoop wrote it</figcaption>
            <p className="mt-3 font-display text-xl font-bold text-ink-900">{example.title}</p>
            <div className="mt-2 space-y-3 text-base leading-relaxed text-ink-700">
              {opening.map((part) => (
                <div key={part.text}>
                  {part.heading && <p className="font-semibold text-ink-900">{part.heading}</p>}
                  <p>{part.text}</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${curriculum} links in this draft`}>
              {example.outcomes.map((outcome) => (
                <li key={outcome} className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-800">{outcome}</li>
              ))}
            </ul>
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
                Read the whole draft
              </summary>
              <div className="story-safe mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">{rest}</div>
            </details>
          </figure>
        </div>

        <div className="mt-12">
          <h3 className="font-display text-2xl font-bold leading-tight text-ink-900 text-balance md:text-3xl">
            Now try it with your own note. No signup.
          </h3>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-600">
            Type what you saw today, the way a {settingWord} jots it down. StoryLoop writes the draft here with {curriculum} links,
            keeps the child&apos;s words exactly as you wrote them, and shows you what it is built on.
          </p>
          <div className="mt-6">
            <StoryDemo surface="guide" framework={framework} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Want to keep it?{" "}
            <Link href="/signup" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900" data-track="guide_proof_start_free">
              Start free
            </Link>
            : 3 stories a month, no card. Choose {framework === "UK" ? "EYFS · England" : "Aistear · Ireland"} when you write. You check every word before anything is shared.
          </p>
        </div>
      </div>
    </section>
  );
}
