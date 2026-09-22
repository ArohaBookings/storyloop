"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";
import StoryDemo from "./StoryDemo";

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

            <p className="animate-fade-up-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-600 md:text-lg lg:mx-0">
              Jot a quick note after play. StoryLoop drafts the learning story, curriculum links included. You check
              every word.
            </p>

            {/* One signup label on the whole site. It used to be seven. */}
            <div className="animate-fade-up-2 mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="btn-primary group w-full px-8 py-3.5 text-base sm:w-auto">
                Start free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/pricing" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                Unlimited from NZ$21 / A$19
              </Link>
            </div>

            <p className="animate-fade-up-2 mt-4 text-sm leading-relaxed text-ink-500">
              Three stories a month free, no card needed. Te Whāriki and EYLF.
            </p>

            {/* A real person behind it. The cheapest trust available to a
                one-person product, and the one thing a large incumbent cannot
                put on its homepage. */}
            <div className="animate-fade-up-3 mt-8 flex items-center justify-center gap-3 lg:justify-start">
              <Image
                src="/images/leo.jpg"
                alt="Leo, who builds StoryLoop"
                width={48}
                height={48}
                className="h-12 w-12 flex-none rounded-full object-cover object-top ring-2 ring-clay-100"
              />
              <p className="max-w-xs text-left text-sm leading-relaxed text-ink-500">
                Built by{" "}
                <Link href="/about" className="font-semibold text-ink-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-700">
                  Leo
                </Link>
                , 20, in Christchurch. Every story is checked against what you actually wrote.
              </p>
            </div>
          </div>

          <div className="animate-fade-up-1 min-w-0">
            <p className="section-title mb-3 text-center lg:text-left">Try it now, no signup</p>
            <StoryDemo compact />
            <p className="mt-3 flex items-center justify-center gap-2 text-xs leading-relaxed text-ink-500 lg:justify-start">
              <ShieldCheck className="h-4 w-4 flex-none text-sage-600" />
              Private draft. Nothing publishes without you, and nothing is invented.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
