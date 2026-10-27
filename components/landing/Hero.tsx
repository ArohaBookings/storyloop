"use client";
import Link from "next/link";
import { ArrowRight, Layers, Quote, ShieldCheck } from "lucide-react";
import StoryDemo from "./StoryDemo";
import HeroProof from "./HeroProof";

/**
 * The three things a 120-visitor simulated panel (scripts/site-eval, 23 Sept
 * 2026) said stopped them trusting the page in the first ten seconds: will it
 * change what children said, what happens to children's data, and does it
 * mean leaving Storypark. Each answered in one line, with the proof one click
 * away. "Built by Leo, 20" was the single most repeated hesitation at the
 * decision point, so the founder story moved to its own section further down,
 * where it reads as a reason to trust rather than a reason to doubt.
 */
const TRUST = [
  { icon: Quote, text: "Children's words kept exactly. See the test results", href: "/accuracy" },
  { icon: ShieldCheck, text: "Stored in Sydney, never used to train AI", href: "/safety" },
  { icon: Layers, text: "Works with the platform your centre already uses", href: "/works-alongside" },
];

/**
 * The hero carries the demo itself.
 *
 * 604 of 649 visitors never touched the demo when it sat a full scroll below a
 * stock photo. A factorial simulation over seven layout levers (864
 * combinations, calibrated to the observed 6.93% demo-start rate) put the
 * biggest single gain on removing the typing, then on proof at the decision
 * point, then on positioning against the incumbent. This layout keeps that
 * result: a problem-led headline, a pre-filled note, its real draft visible at
 * rest, and a real person behind it.
 *
 * What changed in September 2026 is subtraction. The hero had grown to nine
 * separate text elements, including "no credit card" twice in consecutive
 * lines. Conversion research and the taste rules agree on the same ceiling: a
 * headline, a short line under it, the ways in, and one line of reassurance.
 * The research citation and the "keep your platform" message moved to the band
 * directly below, where they still sit at the decision point on a phone.
 */
export default function Hero() {
  return (
    <section id="live-demo" className="paper-texture relative overflow-hidden pt-24 pb-12 sm:pt-28 md:pb-16">
      <div className="bg-warm-mesh pointer-events-none absolute inset-0" />

      <div className="wide-shell relative z-10">
        {/* On a phone: headline, then the demo. On desktop: two columns. The
            demo is the thing that converts, so it is never more than one
            screen from the top. */}
        <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-14">
          <div className="min-w-0 text-center lg:pt-6 lg:text-left">
            <h1 className="animate-fade-up font-display text-[2.2rem] font-bold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              Still writing learning stories at{" "}
              <span className="scribble-underline italic text-clay-700">9pm</span>?
            </h1>

            {/* Oct 2026: on a phone the first screen shows the result itself (a real
                note and the real story it became) instead of describing it; half of
                visitors left within 6 seconds without scrolling. See HeroProof. */}
            <p className="animate-fade-up-1 mx-auto mt-5 hidden max-w-xl text-base leading-relaxed text-ink-600 md:text-lg lg:mx-0 lg:block">
              Jot a quick note after play. StoryLoop drafts the learning story, curriculum links included. You check
              every word.
            </p>
            <div className="animate-fade-up-1 lg:hidden">
              <HeroProof />
            </div>

            {/* Oct 2026: the free button says what free is, and the second
                button invites their own note. With a monthly price as the
                button beside "Start free", 8 of 24 educators in a persona panel
                read free as a trial; the August hero ("Start free, 3 stories
                included", no price button) converted Facebook visitors at
                6.9%. Real demo runs fell from 8.4% to 3.2% of visitors once the
                sample started playing by itself. The price stays, in one line. */}
            <div className="animate-fade-up-2 mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="btn-primary group w-full px-8 py-3.5 text-base sm:w-auto" data-track="home_hero_start">
                Start free, 3 stories a month
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#hero-demo"
                className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto"
                data-track="home_hero_try"
                onClick={(event) => {
                  // Put the cursor in the note with the example selected, so
                  // typing replaces it. On desktop the demo is already beside
                  // the button, so scrolling alone did nothing visible.
                  const box = document.querySelector<HTMLTextAreaElement>("#hero-demo textarea");
                  if (!box) return;
                  event.preventDefault();
                  box.scrollIntoView({ behavior: "smooth", block: "center" });
                  box.focus({ preventScroll: true });
                  box.select();
                }}
              >
                Try it with your own note
              </a>
            </div>

            <p className="animate-fade-up-2 mt-4 text-sm leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-800">Free:</span> 3 stories every month, no card.{" "}
              <span className="font-semibold text-ink-800">Unlimited:</span> NZ$21 or A$19 a month.{" "}
              <Link href="/pricing" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">See all prices</Link>
            </p>

            <ul className="animate-fade-up-3 mt-7 grid gap-2.5 text-left sm:max-w-md lg:max-w-none" aria-label="Why educators trust it">
              {TRUST.map((item) => (
                <li key={item.text}>
                  <Link href={item.href} className="group inline-flex items-start gap-2.5 text-sm font-medium leading-relaxed text-ink-700 hover:text-clay-800">
                    <item.icon className="mt-0.5 h-4 w-4 flex-none text-sage-700" strokeWidth={2} />
                    <span className="underline decoration-clay-200 underline-offset-4 group-hover:decoration-clay-500">{item.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div id="hero-demo" className="animate-fade-up-1 min-w-0 scroll-mt-24">
            <p className="section-title mb-1 text-center lg:text-left">Try it with your own note, no signup</p>
            <p className="mb-3 text-center text-xs leading-relaxed text-ink-500 lg:text-left">Replace the example with something from your day (first names only), or just press the button.</p>
            <StoryDemo compact />
            <p className="mt-3 flex items-center justify-center gap-2 text-xs leading-relaxed text-ink-500 lg:justify-start">
              <ShieldCheck className="h-4 w-4 flex-none text-sage-600" />
              A private draft. Nothing is shared until you choose, and every draft shows what it is built on.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
