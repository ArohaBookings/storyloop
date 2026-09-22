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
    desc: "Edit anything, then copy or export it into Storypark, Educa or wherever you share.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-24">
      <div className="wide-shell">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
          From a quick note to a story you would sign.
        </h2>

        <ol className="relative mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-3 md:gap-8">
          {/* The thread between the steps. Decorative, so hidden from readers. */}
          <div aria-hidden="true" className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-clay-200 md:block" />
          {STEPS.map((step) => (
            <li key={step.title} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-700 text-paper shadow-warm">
                <step.icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-ink-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-base leading-relaxed text-ink-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
