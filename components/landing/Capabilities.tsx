import Image from "next/image";
import { Check, DoorOpen, FileHeart, Mic, QrCode, ShieldCheck } from "lucide-react";
import { WALL_LANGUAGES } from "@/lib/wall-languages";

/**
 * What StoryLoop does beyond the story itself.
 *
 * Until September 2026 none of this was on the homepage, so a visitor met a
 * story generator and nothing else, and the features that no documentation
 * product has (a child speaking for themselves, a wall that explains itself in
 * a family's language, a record the family keeps) were only visible after
 * signing up.
 *
 * A bento rather than a row of equal cards: five things, five cells, two with
 * real photography and three tinted, so the grid has rhythm instead of five
 * identical boxes of text. On a wide screen the second photo cell mirrors the
 * first (image left on top, image right below) and spans two rows, so the two
 * short text cells stack beside it instead of stretching to its height. The
 * language chips in the wall-card cell are the real endonyms the feature uses,
 * not a mocked-up screenshot.
 */
export default function Capabilities() {
  const chips = WALL_LANGUAGES.filter((language) => ["mi", "sm", "zh-Hans", "hi", "ar"].includes(language.code));

  return (
    <section id="features" className="bg-cream-50/60 py-20 md:py-24">
      <div className="wide-shell">
        <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
          For the whole day, not just the story.
        </h2>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {/* A: the child's own words. The widest cell, because it is the one
              thing no documentation product has ever done. */}
          <article className="group grid overflow-hidden rounded-3xl border border-clay-100 bg-paper transition-transform duration-300 hover:-translate-y-0.5 sm:grid-cols-2 lg:col-span-2">
            <div className="relative min-h-[220px] sm:min-h-full">
              <Image
                src="/images/children-learning.jpg"
                alt="An educator on the floor with three children and letter cards"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-7">
              <Mic className="h-6 w-6 text-clay-700" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-2xl font-bold leading-snug text-ink-900">
                Children tell you, in their own words.
              </h3>
              <p className="mt-2 text-base leading-relaxed text-ink-600">
                One big button a three-year-old can press. They talk about their work, hear it back, and you write down
                exactly what they said.
              </p>
            </div>
          </article>

          {/* B: the wall card, in the family's language. */}
          <article className="flex flex-col rounded-3xl border border-sage-200 bg-sage-50 p-7 transition-transform duration-300 hover:-translate-y-0.5">
            <QrCode className="h-6 w-6 text-sage-700" strokeWidth={1.75} />
            <h3 className="mt-4 font-display text-2xl font-bold leading-snug text-ink-900">
              The wall explains itself.
            </h3>
            <p className="mt-2 text-base leading-relaxed text-ink-600">
              A small code beside a display. Families scan it at pickup and read the learning behind it, in their own
              language.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Some of the languages a wall card can be read in">
              {chips.map((language) => (
                <li
                  key={language.code}
                  lang={language.code}
                  dir={language.rtl ? "rtl" : undefined}
                  className="rounded-full border border-sage-200 bg-paper px-3 py-1 text-sm text-ink-700"
                >
                  {language.endonym}
                </li>
              ))}
            </ul>
          </article>

          {/* C: the passport. */}
          <article className="flex flex-col rounded-3xl border border-clay-100 bg-cream-100 p-7 transition-transform duration-300 hover:-translate-y-0.5">
            <FileHeart className="h-6 w-6 text-clay-700" strokeWidth={1.75} />
            <h3 className="mt-4 font-display text-2xl font-bold leading-snug text-ink-900">
              What they take to school.
            </h3>
            <p className="mt-2 text-base leading-relaxed text-ink-600">
              One file a family keeps: who their child is as a learner. It opens on any computer, offline, with no
              account.
            </p>
          </article>

          {/* D: the pickup brief. Two columns, two rows on a wide screen. */}
          <article className="grid overflow-hidden rounded-3xl border border-clay-100 bg-paper transition-transform duration-300 hover:-translate-y-0.5 sm:grid-cols-2 lg:col-span-2 lg:row-span-2">
            <div className="flex flex-col justify-center p-7">
              <DoorOpen className="h-6 w-6 text-clay-700" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-2xl font-bold leading-snug text-ink-900">
                Better than &ldquo;he had a good day&rdquo;.
              </h3>
              <p className="mt-2 text-base leading-relaxed text-ink-600">
                Before the door opens, the specific true thing next to each child&apos;s name, taken from what you wrote
                down. A child with nothing recorded today is shown that plainly. Never invented.
              </p>
            </div>
            <div className="relative order-first min-h-[220px] sm:order-last sm:min-h-full">
              <Image
                src="/images/writing.jpg"
                alt="Children playing with a wooden train track in an early learning room"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </article>

          {/* E: privacy, stated as mechanisms rather than as a promise. */}
          <article className="flex flex-col rounded-3xl border border-clay-200 bg-clay-50 p-7 transition-transform duration-300 hover:-translate-y-0.5">
            <ShieldCheck className="h-6 w-6 text-clay-700" strokeWidth={1.75} />
            <h3 className="mt-4 font-display text-2xl font-bold leading-snug text-ink-900">
              Privacy first, not a footnote.
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                "Children's recordings are never stored",
                "Wall pages carry no names or photos",
                "Nothing is shared until you say so",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-base leading-relaxed text-ink-700">
                  <Check className="mt-1 h-4 w-4 flex-none text-sage-700" strokeWidth={2} />
                  {line}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
