import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

/**
 * Who is behind it, told once, in its own section.
 *
 * It used to be a one-line "Built by Leo, 20" beside the signup button, where
 * the simulated panel read it as a reason to hesitate at the moment of
 * deciding. Here, with the reasons attached (Leo reads every email and can fix
 * a bad story that week), the same facts read as the thing a big company can't
 * offer. The words follow the About page, which is Leo's own account.
 */
export default function Founder() {
  return (
    <section id="founder" className="py-20 md:py-24">
      <div className="wide-shell grid items-center gap-10 md:grid-cols-[minmax(0,300px)_1fr] lg:gap-16">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-3xl border border-clay-100 bg-cream-100">
          <Image src="/images/leo-storyloop-founder.jpg" alt="Leo, who builds StoryLoop, in Christchurch" fill sizes="300px" className="object-cover object-top" />
        </div>
        <div className="max-w-2xl">
          <p className="section-title mb-3">Who builds it</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            Hi, I&apos;m Leo. I build StoryLoop in Christchurch.
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink-700">
            <p>
              I&apos;m 20, and I&apos;m not an early childhood teacher, so I built StoryLoop the only honest way I could:
              in front of educators, who told me every time a draft invented something or tidied a child&apos;s words
              into proper sentences.
            </p>
            <p>
              I still build every part of it myself. When you email StoryLoop, I read it, and if a story came out wrong I
              can usually fix it that week.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href="mailto:ariacareapp@gmail.com" className="btn-secondary" data-track="founder_email">
              <Mail className="h-4 w-4" /> Email me
            </a>
            <Link href="/about" className="text-base font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
              Why I started StoryLoop
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
