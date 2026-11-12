"use client";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import HeroPhotoProof from "@/components/landing/HeroPhotoProof";
import HomeFilm from "@/components/landing/HomeFilm";
import { HERO_SHOWS_FILM } from "@/lib/home-film";

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
 * every other change.
 *
 * Nothing else goes in the hero without asking Leo first. "Stored in Sydney.
 * Never used to train AI." was tried here on 3 Nov and taken out the same day
 * at his request: it lives, large and bold, on /features and /about.
 *
 * 12 Nov 2026: the 20 second film takes the picture slot (Leo's order) and the
 * photograph with its proof card moves to How it works. HERO_SHOWS_FILM in
 * lib/home-film.ts swaps them back. Headline, line and buttons are unchanged.
 */
export default function Hero() {
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
            {/* 13 Nov 2026: one quiet way in for the person who decides for a centre.
                Under the buttons, so it can never push "Start free" down; 44px tall to tap. */}
            <Link
              href="/for-centres?utm_source=home&utm_medium=hero_leader"
              data-track="home_hero_leader"
              data-testid="home-hero-leader"
              className="animate-fade-up-2 mt-1 inline-flex min-h-[44px] items-center text-sm text-ink-500 underline decoration-clay-200 underline-offset-4 hover:text-ink-800"
            >
              Deciding for a whole centre? See what a leader gets
            </Link>
          </div>

          {HERO_SHOWS_FILM ? <HomeFilm inHero /> : <HeroPhotoProof inHero />}
        </div>
      </div>
    </section>
  );
}
