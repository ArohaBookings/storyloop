"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Check, ShieldCheck } from "lucide-react";
import StoryDemo from "./StoryDemo";

/**
 * The hero carries the demo itself.
 *
 * 604 of 649 visitors never touched the demo when it sat a full scroll below a
 * stock photo. A factorial simulation over seven layout levers (864
 * combinations, calibrated to the observed 6.93% demo-start rate) put the
 * biggest single gain on removing the typing, then on proof at the decision
 * point, then on positioning against the incumbent. This layout is that result:
 * a problem-led headline, a pre-filled note, a real draft visible at rest, and
 * a companion rather than replacement pitch.
 */
export default function Hero() {
  return (
    <section id="live-demo" className="paper-texture relative overflow-hidden pt-24 pb-14 sm:pt-28 md:pb-20">
      <div className="bg-warm-mesh pointer-events-none absolute inset-0" />

      <div className="wide-shell relative z-10">
        {/* Three blocks. On a phone they stack headline -> DEMO -> the rest, so
            the demo is reachable on a 375px screen without scrolling past a
            wall of copy: half our traffic is mobile and the demo is the thing
            that converts. On desktop the demo moves to its own column. */}
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-x-12 lg:gap-y-6">

          {/* --------------------------------------- headline (mobile: 1st) */}
          <div className="min-w-0 text-center lg:col-start-1 lg:row-start-1 lg:pt-2 lg:text-left">
            <div className="animate-fade-up mb-4 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-clay-200 bg-cream-100 px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-clay-500" />
                <span className="text-[11px] font-semibold tracking-wide text-clay-700 sm:text-xs">
                  Built for real ECE rooms in Aotearoa and Australia
                </span>
              </div>
            </div>

            <h1 className="animate-fade-up-1 font-display text-[2.1rem] font-bold leading-[1.06] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.3rem]">
              Still writing learning stories at{" "}
              <span className="scribble-underline italic text-clay-700">9pm</span>?
            </h1>

            <p className="animate-fade-up-2 mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600 lg:mx-0 md:text-lg">
              Thumb in half a sentence after block play. StoryLoop turns it into an editable draft with
              the curriculum links already mapped. You review every word.
            </p>
          </div>

          {/* ------------------------------------------- demo (mobile: 2nd) */}
          <div className="animate-fade-up-2 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="mb-2.5 flex flex-col gap-1 text-center lg:text-left">
              <p className="section-title">Try it now — no signup</p>
              <p className="text-sm text-ink-500">
                There is a real note in the box already. Press the button.
              </p>
            </div>

            <StoryDemo compact />

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] leading-relaxed text-ink-400 lg:justify-start">
              <ShieldCheck className="h-3.5 w-3.5 flex-none text-sage-500" />
              <span>Private draft. Nothing publishes without you, and nothing is invented.</span>
            </div>
          </div>

          {/* --------------------------- proof and actions (mobile: 3rd) */}
          <div className="min-w-0 text-center lg:col-start-1 lg:row-start-2 lg:text-left">
            {/* The only independent, peer-reviewed number on this page. It
                states the problem in someone else's voice, which is the one
                thing our own copy can never do. n=570, not vendor research. */}
            <div className="animate-fade-up-3 mx-auto mb-4 max-w-xl rounded-2xl border border-clay-200 bg-cream-100/70 p-4 text-left lg:mx-0">
              <p className="text-sm leading-relaxed text-ink-700">
                <span className="font-bold text-ink-900">
                  More than three-quarters of Australian early childhood educators work about nine unpaid
                  hours a week.
                </span>{" "}
                Two-thirds say the workload is hurting the care they can give.
              </p>
              <a
                href="https://link.springer.com/article/10.1007/s13384-025-00847-z"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-[11px] font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
              >
                Harper, Wilson &amp; McGrath-Champ (2025), The Australian Educational Researcher
              </a>
            </div>

            {/* The 2026 objection, answered before it is asked: Storypark
                shipped its own AI in April, so "replace your platform" is a
                fight we do not need to have. */}
            <div className="animate-fade-up-3 mx-auto max-w-xl rounded-2xl border border-sage-200 bg-sage-50/70 p-4 text-left lg:mx-0">
              <p className="text-sm font-semibold leading-relaxed text-ink-800">
                Keep Storypark, Educa or Kinderloop.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                StoryLoop does not replace your centre&apos;s system. It writes the draft, then exports
                straight into whatever you already use.
              </p>
            </div>

            <div className="animate-fade-up-4 mt-5 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="btn-primary group w-full px-7 py-3.5 text-base sm:w-auto">
                <Sparkles className="h-4 w-4" /> Start free, 3 stories included
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                How it works
              </a>
            </div>

            <div className="animate-fade-up-5 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-500 lg:justify-start">
              {["No credit card", "Te Whāriki + EYLF", "Works on your phone"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-sage-500" />
                  {item}
                </span>
              ))}
            </div>

            {/* A real person behind it. Storypark cannot put a founder's face
                on a page; a one-person product can, and it is the cheapest
                trust available to us. */}
            <div className="animate-fade-up-5 mt-6 flex items-center justify-center gap-3 lg:justify-start">
              <Image
                src="/images/leo.jpg"
                alt="Leo, who builds StoryLoop"
                width={44}
                height={44}
                className="h-11 w-11 flex-none rounded-full object-cover object-top ring-2 ring-clay-100"
              />
              <p className="max-w-xs text-left text-xs leading-relaxed text-ink-500">
                Built by <Link href="/about" className="font-semibold text-ink-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-700">Leo</Link>,
                20, in Christchurch. Every story is checked against what you actually wrote.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
