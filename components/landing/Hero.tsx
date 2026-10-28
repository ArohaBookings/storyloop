"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HERO_PROOFS, heroRegionForZone, type HeroRegion } from "@/lib/hero-proofs";

/**
 * The first screen: a headline, one line, one way in, and a photograph that
 * shows the product doing its job (28 Oct 2026).
 *
 * Leo: "If you look at that page for 5 seconds and then take it away, no one's
 * going to understand what it was." The hero had grown to 130 words and 10
 * controls on a phone (215 words and 19 controls on a laptop: the demo, its
 * tips, a price line and three trust links all competed with the headline). A
 * five-second glance simulation (storyloop-ops/sim/hero_glance_mc.py) put a
 * headline, an 11-word line, the buttons and a photograph with a small proof
 * chip well ahead of every other layout on every screen size, and showed each
 * extra line (price, trust links) costing understanding. Those moved down the
 * page, not away: the demo is the next section, with the trust links under it,
 * and the prices follow it.
 *
 * The photograph is the one from further down the page that tells the whole
 * story without words: an educator reading a real StoryLoop draft on a tablet
 * while two children, seen from behind, build with blocks. The chip on it is a
 * real example (lib/hero-proofs.ts), chosen by the device's time zone.
 */
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
        <div className="grid min-w-0 items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="min-w-0 text-center lg:text-left">
            <h1 className="animate-fade-up font-display text-[2.15rem] font-bold leading-[1.06] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.6rem] 2xl:text-[4.2rem]">
              Still writing learning stories at{" "}
              <span className="scribble-underline italic text-clay-700">9pm</span>?
            </h1>

            <p className="animate-fade-up-1 mx-auto mt-4 max-w-md text-lg leading-relaxed text-ink-600 md:text-xl lg:mx-0">
              Jot a note after play. StoryLoop writes the learning story.
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
          </div>

          <figure className="animate-fade-up-1 relative mx-auto w-full min-w-0 max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-clay-100 bg-cream-100 shadow-[0_30px_60px_-40px_rgba(74,52,34,0.55)]">
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
              className="absolute bottom-3 left-3 max-w-[16rem] rounded-2xl border border-clay-100 bg-paper/95 px-4 py-3 text-left shadow-[0_18px_36px_-22px_rgba(74,52,34,0.6)] backdrop-blur sm:bottom-5 sm:left-5 lg:-bottom-5 lg:-left-6"
            >
              <span className="block text-sm font-bold leading-snug text-ink-900">
                A quick note became a {proof.words}-word learning story
              </span>
              <span className="mt-1 block text-xs font-semibold leading-snug text-sage-800">{proof.links.join(" · ")}</span>
            </Link>
          </figure>
        </div>
      </div>
    </section>
  );
}
