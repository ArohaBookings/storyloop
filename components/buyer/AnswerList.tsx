import OfferText from "@/components/offer/OfferText";
import type { AnswerBlock } from "@/lib/answer-blocks";

/**
 * The plain answers assistants quote (lib/answer-blocks.ts), shown on the page
 * as questions with their answers, open, so the text an assistant reads is the
 * text a person sees.
 *
 * "section": a band of its own between page sections. "inline": a quiet box
 * inside an article's column, for the examples post, where it sits after the
 * first worked example (splitAfterFirstExample).
 */
export default function AnswerList({
  blocks,
  heading = "Straight answers",
  variant = "section",
}: {
  blocks: AnswerBlock[];
  heading?: string;
  variant?: "section" | "inline";
}) {
  if (!blocks.length) return null;
  const list = (
    <dl className={variant === "inline" ? "mt-3 space-y-4" : "mt-6 space-y-6"}>
      {blocks.map((block) => (
        <div key={block.id} data-answer={block.id}>
          <dt className="font-display text-lg font-bold text-ink-900">{block.question}</dt>
          <dd className="mt-1.5 text-base leading-relaxed text-ink-700">
            <OfferText text={block.answer} />
          </dd>
        </div>
      ))}
    </dl>
  );
  if (variant === "inline") {
    return (
      <aside aria-labelledby="answers-title" className="my-10 rounded-3xl border border-sage-200 bg-white p-5 md:p-6 print:hidden" data-testid="answer-blocks">
        <p id="answers-title" className="text-xs font-bold uppercase tracking-wider text-sage-700">{heading}</p>
        {list}
      </aside>
    );
  }
  return (
    <section id="answers" aria-labelledby="answers-title" className="border-y border-clay-100 bg-white py-12 md:py-16 print:hidden" data-testid="answer-blocks">
      <div className="reading-shell">
        <h2 id="answers-title" className="font-display text-2xl font-bold text-ink-900 md:text-3xl">{heading}</h2>
        {list}
      </div>
    </section>
  );
}
