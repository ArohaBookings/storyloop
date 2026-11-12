"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { HERO_PROOFS, heroRegionForZone, type HeroRegion } from "@/lib/hero-proofs";

function Excerpt({ text, quote }: { text: string; quote: string }) {
  const at = text.indexOf(quote);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-sage-100 px-0.5 font-semibold not-italic text-sage-900">{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  );
}

/**
 * The classroom photograph with the proof card over it: the actual note and
 * the actual sentence StoryLoop wrote from it, the child's words highlighted
 * (3 Nov 2026, see Hero.tsx for why).
 *
 * It was the hero's picture until 12 Nov 2026, when the film took that slot
 * (HERO_SHOWS_FILM in lib/home-film.ts). The same card, word for word, now
 * sits in How it works. `inHero` keeps the hero version byte-for-byte what it
 * was, so switching back changes nothing on the first screen.
 */
export default function HeroPhotoProof({ inHero }: { inHero: boolean }) {
  const [region, setRegion] = useState<HeroRegion>("AU");
  useEffect(() => {
    try {
      setRegion(heroRegionForZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""));
    } catch {
      /* keep the default */
    }
  }, []);
  const proof = HERO_PROOFS[region];

  return (
    <figure className={`${inHero ? "animate-fade-up-1 " : ""}relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none`}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-clay-100 bg-cream-100 shadow-[0_30px_60px_-40px_rgba(74,52,34,0.55)] sm:aspect-[4/3]">
        <Image
          src="/images/scenes/classroom.jpg"
          alt="An educator reads a StoryLoop learning story on a tablet while two toddlers, seen from behind, build a block tower"
          fill
          priority={inHero}
          sizes={inHero ? "(min-width: 1024px) 50vw, (min-width: 640px) 36rem, 100vw" : "(min-width: 1024px) 45vw, (min-width: 640px) 36rem, 100vw"}
          className="object-cover"
          style={{ objectPosition: "58% 50%" }}
        />
      </div>
      <Link
        href={proof.href}
        data-track={inHero ? "home_hero_proof" : "home_how_proof"}
        data-testid="hero-proof"
        className="relative mx-3 -mt-16 block rounded-2xl border border-clay-100 bg-paper/95 p-4 text-left shadow-[0_18px_36px_-22px_rgba(74,52,34,0.6)] backdrop-blur sm:mx-6 lg:absolute lg:-bottom-8 lg:-left-8 lg:mx-0 lg:mt-0 lg:max-w-[24rem]"
      >
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-500">The educator&apos;s note</span>
        <span className="mt-1 block font-mono text-[13px] leading-snug text-ink-700">{proof.jot}</span>
        <span className="my-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sage-800 sm:my-2">
          <ArrowDown className="h-3.5 w-3.5" /> StoryLoop&apos;s story, child&apos;s words kept
        </span>
        <span className="block font-display text-[15px] italic leading-snug text-ink-900">
          <Excerpt text={proof.excerpt} quote={proof.quote} />
        </span>
        {/* The curriculum links wait for the full story on a phone, to keep the first screen short. */}
        <span className="mt-2 block text-xs font-semibold text-sage-800">
          <span className="hidden sm:inline">{proof.links.join(" · ")} · </span>Read the whole story
        </span>
      </Link>
    </figure>
  );
}
