import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The last thing on the homepage: one line of promise, one button.
 *
 * It used to repeat the whole offer in a card with an icon badge, a headline
 * about backlogs, a paragraph, and a strip of three dot-separated reassurances
 * that had already appeared twice above it. By this point the visitor has read
 * the offer; what is left is the decision.
 */
export default function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="reading-shell text-center">
        <h2 className="font-display text-4xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">
          Get your evenings back.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-ink-600 md:text-lg">
          Write your next three learning stories free. If the drafts do not sound like you, you have lost ten minutes.
        </p>
        <Link href="/signup" className="btn-primary group mt-8 px-8 py-4 text-base">
          Start free
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
