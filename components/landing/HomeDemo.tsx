import Link from "next/link";
import { Layers, Quote, ShieldCheck } from "lucide-react";
import StoryDemo from "./StoryDemo";

/**
 * Three answers a sceptical educator needs before typing a note about a child:
 * will it change what children said, what happens to children's data, and does
 * it mean a fight with the centre's systems. Each answered in one line, with
 * the proof one click away. They sat in the hero until 28 Oct 2026, where the
 * five-second glance simulation showed them costing first-screen understanding;
 * here they sit at the moment of typing, which is when the question is asked.
 */
const TRUST = [
  { icon: Quote, text: "Children's words kept exactly. See the test results", href: "/accuracy" },
  { icon: ShieldCheck, text: "Stored in Sydney, never used to train AI", href: "/safety" },
  { icon: Layers, text: "Pastes into the app your centre already uses", href: "/features#families" },
];

/**
 * The demo, one scroll below the hero (28 Oct 2026). Before 16 Sept it sat
 * below the hero too, and 7.4% of visitors tried it; inside the hero, beside
 * the headline, real tries were 0.5 to 3%. The box starts empty for the
 * educator's own note, with the example one tap away (see StoryDemo).
 */
export default function HomeDemo() {
  return (
    <section id="live-demo" className="border-y border-clay-100 bg-cream-50/60 py-12 md:py-16">
      <div className="wide-shell">
        <div id="hero-demo" className="mx-auto min-w-0 max-w-3xl scroll-mt-24">
          <h2 className="text-center font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            Try it with your own note
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-ink-600 md:text-base">
            No signup. Type a few lines from your day (first names only), or tap &ldquo;Use an example&rdquo;.
          </p>
          <div className="mt-6">
            <StoryDemo compact />
          </div>
          <ul className="mt-6 grid gap-2.5 sm:justify-center md:flex md:flex-wrap md:gap-x-6" aria-label="Why educators trust it">
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
      </div>
    </section>
  );
}
