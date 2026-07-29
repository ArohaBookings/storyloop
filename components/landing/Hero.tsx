"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Check, PenLine, ShieldCheck } from "lucide-react";
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
                  Built for real ECE rooms in Aotearoa and Australia
                </span>
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 animate-fade-up-1 sm:text-5xl md:text-6xl">
              Learning stories drafted <span className="italic text-clay-700">faster</span>, without
              losing the <span className="scribble-underline">educator&apos;s voice</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-600 animate-fade-up-2 lg:mx-0 md:text-lg">
              Thumb in half-sentences after block play, record a voice memo beside the sandpit, or paste the note
              you meant to finish at lunch. StoryLoop turns it into an editable draft; you review every word.
            </p>

            <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-clay-200 bg-white/75 p-4 text-left shadow-soft backdrop-blur animate-fade-up-3 lg:mx-0">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                  <PenLine className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-clay-600">A realistic starting note</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-800">
                    “Made the bridge wider after it fell. Said, ‘It needs two blocks.’”
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    Exact words stay exact. Curriculum links appear only when the observation supports them.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col items-center gap-3 animate-fade-up-4 sm:flex-row lg:justify-start">
              <Link href="/signup" className="btn-primary group px-8 py-4 text-base">
                <Sparkles className="h-4 w-4" /> Start free, 3 stories included
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#live-demo" className="btn-secondary px-8 py-4 text-base">
                See it work first
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-500 animate-fade-up-5 lg:justify-start">
              {["No credit card", "Te Whāriki + EYLF", "Works on your phone"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-sage-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: a real face. This is the trust gap versus Storypark. */}
          <div className="hero-photo-motion relative animate-fade-up-2">
            <SiteImage
              src="/images/hero.jpg"
              alt="An early childhood educator in a classroom prepared for children's learning"
              className="aspect-[4/5] w-full shadow-warm md:aspect-[5/6]"
              priority
            />
            <div className="hero-proof-motion absolute right-3 top-3 hidden max-w-[13rem] items-center gap-2 rounded-xl border border-sage-200 bg-paper/95 px-3 py-2 text-[11px] font-bold leading-tight text-sage-800 shadow-soft backdrop-blur sm:flex">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Private draft. Nothing publishes without you.
            </div>
            {/* Small floating proof card, the kind that reads as human and real */}
            <div className="hero-proof-motion absolute -bottom-5 -left-3 hidden max-w-[16rem] rounded-2xl border border-clay-100 bg-paper/95 p-4 shadow-soft backdrop-blur sm:block">
              <p className="text-xs font-bold text-ink-900">From a 12-word note</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                to an editable draft with evidence checks and curriculum links, while the moment is still fresh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
