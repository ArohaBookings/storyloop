import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { draftOpening, proofExample } from "@/lib/guide-proof";
import StoryDemo from "@/components/landing/StoryDemo";

/**
 * A real note and the start of the real draft StoryLoop wrote from it, placed
 * on the guides a reader arrives at from search.
 *
 * Why it exists: from 1 Aug to 29 Sep 2026 every one of 23 signups started on
 * the homepage, where the demo shows a finished draft at rest, and the guides
 * turned 271 landings into none. A guide reader has come to learn, so the
 * product appears as proof at the point of interest, not as a louder button.
 * The drafts shown call no AI: both are exactly what production wrote in the
 * 23 Sep evaluation run (lib/real-examples.ts), shown unedited. Below them the
 * reader can try their own note without signing up (the public demo, rate
 * limited per visitor), because a link to /signup still turned 602 guide
 * landings into 4 signups in the 60 days to 13 Oct.
 */
export default function GuideProof({
  framework,
  demo = framework,
}: {
  framework: "NZ" | "AU";
  /** The curriculum the "try your own note" draft uses. "visitor": their country decides (NZ gets Te Whāriki, everyone else EYLF). */
  demo?: "NZ" | "AU" | "visitor";
}) {
  const example = proofExample(framework);
  if (!example) return null;
  const draft = draftOpening(example.story);
  const curriculum = framework === "NZ" ? "Te Whāriki" : "EYLF V2.0";

  return (
    <section id="see-it" aria-labelledby="see-it-title" className="border-y border-clay-100 bg-white py-12 md:py-16">
      <div className="wide-shell">
        <div className="max-w-3xl">
          <p className="section-title mb-3">What StoryLoop does with a note</p>
          <h2 id="see-it-title" className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            A rough note in, a learning story out.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600 md:text-lg">
            A real note an educator typed, and the start of the draft StoryLoop wrote from it, unedited, with the {curriculum} links,
            learning and next steps to follow.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <figure className="rounded-3xl border border-clay-200 bg-cream-50 p-5 md:p-6">
            <figcaption className="text-xs font-bold uppercase tracking-wider text-ink-500">
              The note · {example.childName}, {example.age.toLowerCase()}
            </figcaption>
            <blockquote className="mt-3 font-mono text-[15px] leading-relaxed text-ink-800">{example.note}</blockquote>
          </figure>
          <figure className="relative overflow-hidden rounded-3xl border border-sage-200 bg-paper p-5 md:p-6">
            <figcaption className="text-xs font-bold uppercase tracking-wider text-sage-700">The draft, as StoryLoop wrote it</figcaption>
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
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
              data-track="guide_proof_full_draft"
            >
              Read the full draft <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </figure>
        </div>

        <div id="try" className="mt-12 scroll-mt-24">
          <h3 className="font-display text-2xl font-bold leading-tight text-ink-900 text-balance md:text-3xl">
            Now try it with your own note. No signup.
          </h3>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-600">
            Type what you saw today. StoryLoop writes the draft here, with{" "}
            {demo === "visitor" ? "Te Whāriki or EYLF V2.0" : demo === "NZ" ? "Te Whāriki" : "EYLF V2.0"} links, and shows you exactly what it is
            built on.
          </p>
          <div className="mt-6">
            <StoryDemo surface="guide" framework={demo === "visitor" ? undefined : demo} />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            Want to keep it?{" "}
            <Link href="/signup" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900" data-track="guide_proof_start_free">
              Start free
            </Link>
            : 3 stories a month, no card. You check every word before anything is shared.
          </p>
        </div>
      </div>
    </section>
  );
}
