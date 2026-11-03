import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * "Stored in Sydney. Never used to train AI.", large and bold, on /features and
 * /about. Leo, 3 Nov 2026: make it bigger, but not in the hero. The wording
 * matches /accuracy and /safety.
 */
export default function TrustStatement() {
  return (
    <section aria-label="Where children's information is kept" className="border-y border-sage-200 bg-sage-50 py-12 md:py-16" data-testid="trust-statement">
      <div className="wide-shell">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center md:flex-row md:items-start md:gap-7 md:text-left">
          <ShieldCheck className="h-12 w-12 flex-none text-sage-700 md:h-14 md:w-14" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">
              Stored in Sydney. Never used to train AI.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-700 md:text-lg">
              Every note and story about a child is kept in Sydney, sent to the AI only to write the draft, and never used
              to train AI, by us or by the AI providers under their business terms.{" "}
              <Link href="/safety" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
                How children&apos;s information is handled
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
