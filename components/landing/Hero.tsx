"use client";
import Link from "next/link";
import { ArrowRight, Layers, Quote, ShieldCheck } from "lucide-react";
import StoryDemo from "./StoryDemo";

/**
 * The three things a 120-visitor simulated panel (scripts/site-eval, 23 Sept
 * 2026) said stopped them trusting the page in the first ten seconds: will it
 * put words in a child's mouth, what happens to children's data, and does it
 * mean leaving Storypark. Each answered in one line, with the proof one click
 * away. "Built by Leo, 20" was the single most repeated hesitation at the
 * decision point, so the founder story moved to its own section further down,
 * where it reads as a reason to trust rather than a reason to doubt.
 */
const TRUST = [
  { icon: Quote, text: "Children's words kept exactly. See the test results", href: "/accuracy" },
  { icon: ShieldCheck, text: "Stored in Sydney, never used to train AI", href: "/privacy" },
  { icon: Layers, text: "Works alongside Storypark, Educa and Kinderloop", href: "#how-it-works" },
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
                Unlimited from NZ$21 / A$19 a month
              </Link>
            </div>

            {/* Free and trial, said once and unmistakably: the panel could not
                tell whether "free" meant a trial or three stories a month. */}
            <p className="animate-fade-up-2 mt-4 text-sm leading-relaxed text-ink-600">
              <span className="font-semibold text-ink-800">Free forever:</span> 3 stories a month, no card.{" "}
              <span className="font-semibold text-ink-800">Unlimited:</span> NZ$21 or A$19 a month for one educator, after a
              7-day free trial. Centres pay one price for the whole team.
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

          <div className="animate-fade-up-1 min-w-0">
            <p className="section-title mb-3 text-center lg:text-left">Try it now, no signup</p>
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
