import Image from "next/image";
import { Mic, PenLine, Send } from "lucide-react";

/**
 * How it works, in the three moves an educator actually makes.
 *
 * This used to be five identical boxed cards with 01 to 05 badges and a CPU
 * icon for the AI step. Five steps is more process than the product has, the
 * number badges repeat what the order already says, and a chip icon is the
 * least human picture you can put next to a child's learning. Three verbs, no
 * boxes, and the line joining them does the work of the numbers.
 */
const STEPS = [
  {
    icon: Mic,
    title: "Jot what happened",
    desc: "A few words after play, typed or spoken. Half a sentence is enough.",
  },
  {
    icon: PenLine,
    title: "Get a real draft",
    desc: "A learning story in your voice, with Te Whāriki or EYLF links only where the note supports them.",
  },
  {
    icon: Send,
    title: "Make it yours",
    desc: "Edit anything, then share it with families in plain words, or export it anywhere in one tap.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-24">
      <div className="wide-shell grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <h2 className="max-w-xl font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            From a quick note to a story you would sign.
          </h2>
          <ol className="relative mt-10 grid gap-8">
            {/* The thread between the steps. Decorative, so hidden from readers. */}
            <div aria-hidden="true" className="absolute bottom-7 left-7 top-7 w-px bg-clay-200" />
            {STEPS.map((step) => (
              <li key={step.title} className="relative flex gap-5">
                <div className="relative z-10 flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-clay-700 text-paper shadow-warm">
                  <step.icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="pt-1.5">
                  <h3 className="font-display text-xl font-bold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 max-w-md text-base leading-relaxed text-ink-600">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {/* The third step, in a picture: the draft is yours to finish. */}
        <figure className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-clay-100 bg-cream-100">
            <Image
              src="/images/hero.jpg"
              alt="An educator smiling at a desk in a classroom"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-sm leading-relaxed text-ink-500">
            The draft is a starting point, not a finished story. You read it, change what is not right, and share it where
            you always do.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
