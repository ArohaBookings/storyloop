"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HERO_PROOFS } from "@/lib/hero-proofs";

/**
 * The first-screen proof on a phone (27 Oct 2026).
 *
 * Half of homepage visitors left within 6 seconds without scrolling, and on a
 * phone the first screen was a headline, a sentence and buttons: the product
 * itself (a real note becoming a real story) sat below the fold. Phone
 * visitors who reach signup mostly do so without running the demo (22 of 23
 * in the 60 days to 27 Oct), so the first screen has to show the result, not
 * promise it. This replaces the sentence under the headline on a phone with a
 * real note and the real draft it became (lib/real-examples.ts, word for word
 * what the pipeline wrote; lib/hero-proofs.ts), and links to the full story on /examples, the page
 * people stay on longest.
 *
 * Australian visitors see an EYLF example, New Zealand visitors a Te Whāriki
 * one (by the device's time zone; the card keeps the same size either way).
 */

export default function HeroProof() {
  const [region, setRegion] = useState<"AU" | "NZ">("AU");
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      if (zone === "Pacific/Auckland" || zone === "Pacific/Chatham") setRegion("NZ");
    } catch {
      /* keep the default */
    }
  }, []);
  const item = HERO_PROOFS[region];

  return (
    <div className="mx-auto mt-5 max-w-md text-left" data-testid="hero-proof">
      <div className="-rotate-1 rounded-md bg-[#fff6c9] px-4 py-3 shadow-[0_10px_24px_-16px_rgba(74,52,34,0.55)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-clay-700">You jot</p>
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-ink-900">{item.jot}</p>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 pl-1 text-[11px] font-bold uppercase tracking-[0.14em] text-clay-700">
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.4} />
        StoryLoop writes, in about 20 seconds
      </p>
      <Link
        href={`/examples#${item.slug}`}
        className="mt-2 block rounded-2xl border border-clay-200 bg-white px-4 py-3 shadow-[0_14px_30px_-22px_rgba(74,52,34,0.6)]"
        data-track="home_hero_proof"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-bold text-ink-900">{item.title}</span>
          <span className="flex-none text-xs font-semibold text-ink-500">{item.words}-word story</span>
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {item.links.map((link) => (
            <span key={link} className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-bold text-sage-800">{link}</span>
          ))}
          <span className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-bold text-clay-800">Child&apos;s exact words</span>
        </span>
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-clay-700">
          Read the whole story <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
