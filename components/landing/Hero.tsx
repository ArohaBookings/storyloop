"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import SiteImage from "./SiteImage";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 paper-texture sm:pt-32 md:pb-24">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />

      <div className="wide-shell relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Left: the message */}
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:justify-start animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-clay-200 bg-cream-100 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-clay-500" />
                <span className="text-xs font-semibold tracking-wide text-clay-700">
                  Built with educators in Aotearoa and Australia
                </span>
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 animate-fade-up-1 sm:text-5xl md:text-6xl">
              Learning stories drafted <span className="italic text-clay-700">faster</span>, without
              losing the <span className="scribble-underline">educator&apos;s voice</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-600 animate-fade-up-2 lg:mx-0 md:text-lg">
              Turn a rough note or a voice memo into an editable learning story draft. You review and edit every
              word. StoryLoop just means you never start from a blank page at 9pm.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 animate-fade-up-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="btn-primary group px-8 py-4 text-base">
                <Sparkles className="h-4 w-4" /> Start free, 3 stories included
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#live-demo" className="btn-secondary px-8 py-4 text-base">
                See it work first
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-500 animate-fade-up-4 lg:justify-start">
              {["No credit card", "Te Whāriki + EYLF", "Works on your phone"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-sage-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: a real face. This is the trust gap versus Storypark. */}
          <div className="relative animate-fade-up-2">
            <SiteImage
              src="/images/hero.jpg"
              alt="An early childhood educator on the floor with children during play"
              emoji="🧸"
              className="aspect-[4/5] w-full shadow-warm md:aspect-[5/6]"
            />
            {/* Small floating proof card, the kind that reads as human and real */}
            <div className="absolute -bottom-5 -left-3 hidden max-w-[15rem] rounded-2xl border border-clay-100 bg-paper/95 p-4 shadow-soft backdrop-blur sm:block">
              <p className="text-xs font-bold text-ink-900">From a 12 word note</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                to a finished draft with curriculum links, in the time it takes to make a coffee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
