import Link from "next/link";
import type { NoteProof } from "@/lib/buyer-proof";

function Highlighted({ text, quote }: { text: string; quote: string | null }) {
  const at = quote ? text.indexOf(quote) : -1;
  if (!quote || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-sage-100 px-0.5 font-semibold not-italic text-sage-900">{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

/**
 * A finished example on the first screen: a real note an educator wrote and
 * what StoryLoop wrote from it, word for word (lib/buyer-proof.ts). Small on
 * purpose, so the note box still fits under it on a 393 by 673 phone.
 */
export default function ProofChip({ proof, wroteLabel = "What StoryLoop wrote from it" }: { proof: NoteProof; wroteLabel?: string }) {
  return (
    <figure className="rounded-2xl border border-clay-100 bg-white/90 px-3.5 py-3 shadow-soft sm:px-4 sm:py-3.5" data-testid="buyer-proof">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-[11px] font-bold uppercase tracking-wider text-ink-500">An educator&apos;s note</figcaption>
        <Link href={proof.href} className="flex-none text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="buyer_proof_full">
          Read the whole draft
        </Link>
      </div>
      <p className="mt-0.5 font-mono text-[13px] leading-snug text-ink-800">{proof.note}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-sage-700">{wroteLabel}</p>
      <p className="mt-0.5 font-display text-[15px] italic leading-snug text-ink-800">
        <Highlighted text={proof.wrote} quote={proof.quote} />
      </p>
      {proof.links.length > 0 && <p className="mt-1 text-[11px] font-semibold text-ink-500">{proof.links.join(" · ")}</p>}
    </figure>
  );
}
