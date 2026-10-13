import Link from "next/link";
import StoryDemo from "@/components/landing/StoryDemo";

/**
 * The "try your own note" demo on the England (EYFS) and Ireland (Aistear)
 * guides, 13 Oct 2026. GuideProof shows a real AU or NZ draft above its demo;
 * there is no real EYFS or Aistear draft to show yet, so these pages get the
 * demo alone, writing in the page's own curriculum.
 */
export default function InternationalTry({ framework }: { framework: "UK" | "IE" }) {
  const curriculum = framework === "UK" ? "EYFS" : "Aistear";
  const settingWord = framework === "UK" ? "practitioner" : "educator";

  return (
    <section id="try" aria-labelledby="try-title" className="scroll-mt-24 border-y border-clay-100 bg-white py-12 md:py-16">
      <div className="wide-shell">
        <div className="max-w-3xl">
          <p className="section-title mb-3">Try it with your own note</p>
          <h2 id="try-title" className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            A rough note in, a {curriculum} draft out. No signup.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-600 md:text-lg">
            Type what you saw today, the way a {settingWord} jots it down. StoryLoop writes the draft here with {curriculum} links,
            keeps the child&apos;s words exactly as you wrote them, and shows you what it is built on.
          </p>
        </div>
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
    </section>
  );
}
