"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { HERO_PROOFS, heroRegionForZone, type HeroRegion } from "@/lib/hero-proofs";

/**
 * The first screen: a headline, one line, one way in, and a photograph that
 * shows the product doing its job (28 Oct 2026).
 *
 * Leo: "If you look at that page for 5 seconds and then take it away, no one's
 * going to understand what it was." The hero had grown to 130 words and 10
 * controls on a phone; a five-second glance simulation put a headline, one line,
 * the buttons and a photograph with a small proof well ahead of every other
 * layout. The demo is the next section, with the prices after it.
 *
 * 3 Nov 2026: the proof on the photograph shows the actual note and the actual
 * sentence StoryLoop wrote from it, the child's words highlighted, instead of a
 * word count. Visitors were leaving before they saw what the product does (the
 * Meta ad's visitors in a second or two, search visitors in under a minute),
 * and the shopper simulation put "the first screen shows the result" ahead of
 * every other change. "Stored in Sydney. Never used to train AI." moved up from
 * under the demo and grew, at Leo's request.
 */
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

export default function Hero() {
  const [region, setRegion] = useState<HeroRegion>("AU");
  useEffect(() => {
    try {
      setRegion(heroRegionForZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""));
    } catch {
      /* keep the default */
    }
  }, []);
  const proof = HERO_PROOFS[region];

  // Puts the cursor in the demo's note box, one scroll down.
  const goToDemo = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const box = document.querySelector<HTMLTextAreaElement>("#hero-demo textarea");
    if (!box) return;
    event.preventDefault();
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    box.focus({ preventScroll: true });
  };

  return (
    <section id="hero" className="paper-texture relative overflow-hidden pt-24 pb-10 sm:pt-28 md:pb-16">
      <div className="bg-warm-mesh pointer-events-none absolute inset-0" />

      <div className="wide-shell relative z-10">
        <div className="grid min-w-0 items-center gap-6 sm:gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="min-w-0 text-center lg:text-left">
            <h1 className="animate-fade-up font-display text-[2.15rem] font-bold leading-[1.06] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.6rem] 2xl:text-[4.2rem]">
              Still writing learning stories at{" "}
              <span className="scribble-underline italic text-clay-700">9pm</span>?
            </h1>

            <p className="animate-fade-up-1 mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-600 md:text-xl lg:mx-0">
              Jot a note after play. StoryLoop writes the learning story and checks every word.
            </p>

            <div className="animate-fade-up-2 mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup" className="btn-primary group w-full px-8 py-3.5 text-base sm:w-auto" data-track="home_hero_start">
                Start free, 3 stories a month
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {/* The wrapper does the hiding: .btn-secondary sets its own display. */}
              <span className="hidden sm:inline-flex">
                <a href="#hero-demo" onClick={goToDemo} data-track="home_hero_try" className="btn-secondary px-7 py-3.5 text-base">
                  Try it with your own note
                </a>
              </span>
              <a
                href="#hero-demo"
                onClick={goToDemo}
                data-track="home_hero_try"
                className="inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 sm:hidden"
              >
                or try it with your own note <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* One line on a phone: 16px from 390px wide, 15px on the 375px phones, larger from tablets up. */}
            <p className="animate-fade-up-2 mt-5 inline-flex items-center gap-2 rounded-2xl border border-sage-200 bg-sage-50/80 px-3 py-2 text-[15px] font-semibold text-sage-900 min-[390px]:text-base sm:mt-6 sm:gap-2.5 sm:rounded-full sm:px-4 md:text-lg" data-testid="hero-trust">
              <ShieldCheck className="h-5 w-5 flex-none text-sage-700 md:h-6 md:w-6" strokeWidth={2.2} />
              Stored in Sydney. Never used to train AI.
            </p>
          </div>

          <figure className="animate-fade-up-1 relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-clay-100 bg-cream-100 shadow-[0_30px_60px_-40px_rgba(74,52,34,0.55)] sm:aspect-[4/3]">
              <Image
                src="/images/scenes/classroom.jpg"
                alt="An educator reads a StoryLoop learning story on a tablet while two toddlers, seen from behind, build a block tower"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, (min-width: 640px) 36rem, 100vw"
                className="object-cover"
                style={{ objectPosition: "58% 50%" }}
              />
            </div>
            <Link
              href={proof.href}
              data-track="home_hero_proof"
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
        </div>
      </div>
    </section>
  );
}
