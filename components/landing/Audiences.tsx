import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Who StoryLoop is for, one photograph each. Every screen in these photographs
 * is a real StoryLoop page put onto the device afterwards
 * (scripts/brand/composite_scenes.py), never a drawn interface, and children
 * are only ever shown from behind, the way centres photograph them for families.
 */
const AUDIENCES = [
  {
    who: "Educators",
    title: "Finish the story before you leave, not at 9pm.",
    body: "A quick note or a voice memo becomes a draft with curriculum links and where to next. You check every word.",
    href: "/for-educators",
    cta: "StoryLoop for educators",
    image: "/images/scenes/kitchen.jpg",
    alt: "An educator at her kitchen table in the evening, smiling at a StoryLoop draft on her laptop",
    position: "62% 50%",
  },
  {
    who: "Centres",
    title: "One price for the whole team.",
    body: "Consistent stories across every room, from NZ$109 or A$99 a month for up to 10 educators.",
    href: "/for-centres",
    cta: "StoryLoop for centres",
    image: "/images/scenes/team.jpg",
    alt: "Three educators planning together around a low table with a laptop showing StoryLoop",
    position: "50% 55%",
  },
  {
    who: "Families",
    title: "Learning, in words families can use.",
    body: "A plain-words version, a question to ask at home, and wall cards in English and ten other languages.",
    href: "/for-families",
    cta: "What families see",
    image: "/images/scenes/family.jpg",
    alt: "A parent smiling at a StoryLoop wall card on her phone while her toddler, seen from behind, leans on her arm",
    position: "50% 28%",
  },
  {
    who: "Children",
    title: "Their words, exactly as they said them.",
    body: "Every quote is checked against the educator's note, and walls show the learning without names, photos or dates.",
    href: "/safety",
    cta: "How children are protected",
    image: "/images/scenes/classroom.jpg",
    alt: "Two toddlers, seen from behind, building a block tower while an educator holds an iPad with a learning story",
    position: "70% 45%",
  },
];

export default function Audiences() {
  return (
    <section id="for-everyone" className="py-20 md:py-24">
      <div className="wide-shell">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            For everyone around the child.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-ink-600">
            The educator writes it, the centre stands behind it, the family reads it, and the child is at the heart of it.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {AUDIENCES.map((audience) => (
            <li key={audience.who}>
              <Link
                href={audience.href}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-clay-100 bg-white transition-shadow hover:shadow-[0_24px_50px_-30px_rgba(74,52,34,0.5)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={audience.image}
                    alt={audience.alt}
                    fill
                    sizes="(min-width: 1280px) 24vw, (min-width: 640px) 48vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    style={{ objectPosition: audience.position }}
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-paper/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-clay-800">
                    {audience.who}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{audience.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">{audience.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-clay-700">
                    {audience.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
