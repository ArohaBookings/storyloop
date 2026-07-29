import Link from "next/link";
import { Archive, ArrowRight, CircleDotDashed, ClipboardList, Sparkles, Sunrise } from "lucide-react";

const STEPS = [
  {
    icon: Sunrise,
    label: "Morning",
    title: "See three useful prompts",
    body: "Unfinished moments, open next steps, and a child worth making space to notice — never a score or ranking.",
  },
  {
    icon: CircleDotDashed,
    label: "In the room",
    title: "Capture one real moment",
    body: "Write what happened in seconds. A child is optional, a photo is never required, and there is no analysis form.",
  },
  {
    icon: ClipboardList,
    label: "When there is time",
    title: "Decide what it deserves",
    body: "Turn it into a story, hold it for planning, or archive it. The inbox is meant to be cleared, not filled.",
  },
];

export default function TodayLoop() {
  return (
    <section id="today-loop" className="border-y border-clay-100 bg-gradient-to-br from-sage-50 via-paper to-cream-50 py-20 md:py-28">
      <div className="wide-shell">
        <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-center">
          <div className="max-w-2xl">
            <p className="section-title mb-3">New · Today Loop</p>
            <h2 className="font-display text-4xl font-bold leading-tight text-ink-900 md:text-5xl">
              A daily reason to open StoryLoop that is not “write another story.”
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-600">
              Today Loop keeps documentation close to practice without turning the day into data entry. Capture the
              real moment first. Make the documentation decision later.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary">
                Try 10 moments free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/today-loop-ece" className="btn-secondary">
                Why we built it
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-500">10 captured moments a month on Free · unlimited on Educator and above.</p>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, label, title, body }) => (
              <article key={title} className="card flex min-w-0 flex-col p-5 md:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-700 text-paper shadow-warm">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-clay-600">{label}</p>
                <h3 className="mt-1 font-display text-xl font-bold text-ink-900">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{body}</p>
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-sage-700">
                  {label === "When there is time" ? <Archive className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  No duplicate form
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
