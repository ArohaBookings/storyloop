import { BookOpenCheck, Layers } from "lucide-react";

/**
 * The two things a sceptical educator needs to believe before signing up, in
 * one band directly under the hero.
 *
 * First, that the problem is real and measured by somebody other than us: the
 * only independent, peer-reviewed number on the page (n=570, not vendor
 * research). Second, that trying StoryLoop does not mean a fight with their
 * centre: it sits beside Storypark, Educa or Kinderloop, it does not replace
 * them. Storypark shipped its own AI in April 2026, so "switch platforms" is a
 * fight worth never starting.
 */
export default function ProofStrip() {
  return (
    <section aria-label="Why educators try StoryLoop" className="border-y border-clay-100 bg-cream-50/70">
      <div className="wide-shell grid gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-12">
        <div className="flex gap-4">
          <BookOpenCheck className="mt-1 h-6 w-6 flex-none text-clay-700" strokeWidth={1.75} />
          <div>
            <p className="text-base leading-relaxed text-ink-800">
              <span className="font-semibold text-ink-900">
                More than three in four Australian early childhood educators work about nine unpaid hours a week.
              </span>{" "}
              Two in three say the workload hurts the care they can give.
            </p>
            <a
              href="https://link.springer.com/article/10.1007/s13384-025-00847-z"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
            >
              Harper, Wilson and McGrath-Champ (2025), The Australian Educational Researcher
            </a>
          </div>
        </div>

        <div className="flex gap-4">
          <Layers className="mt-1 h-6 w-6 flex-none text-sage-700" strokeWidth={1.75} />
          <div>
            <p className="text-base font-semibold leading-relaxed text-ink-900">Built for Aotearoa and Australia.</p>
            <p className="mt-1 text-base leading-relaxed text-ink-700">
              Te Whāriki and EYLF V2.0 built in, te reo Māori where it belongs, and a version families can read in
              their own language.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
