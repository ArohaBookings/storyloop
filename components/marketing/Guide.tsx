import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";

/**
 * The shared frame for StoryLoop's guides and "who it is for" pages: a
 * question-shaped title, the direct answer straight underneath (what an answer
 * engine quotes and what a skimming reader needs), a visible "updated" date,
 * then sections, the real prices, and where to go next.
 */

export const GUIDE_UPDATED = "24 September 2026";

export function GuidePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <PageTracker />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function GuideHero({
  kicker,
  title,
  answer,
  image,
  imageAlt,
  imagePosition = "center",
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  answer: React.ReactNode;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id="guide-hero" className="border-b border-clay-100 bg-cream-50 pb-12 pt-28 md:pb-16 md:pt-32">
      <div className={`wide-shell grid gap-10 ${image ? "lg:grid-cols-[1.05fr_0.95fr] lg:items-center" : ""}`}>
        <div className="min-w-0">
          <p className="section-title mb-3">{kicker}</p>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink-900 text-balance md:text-5xl">
            {title}
          </h1>
          <div className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-700">{answer}</div>
          <p className="mt-4 text-sm text-ink-500">Updated {GUIDE_UPDATED} · StoryLoop, Ōtautahi Christchurch</p>
          {children}
        </div>
        {image && (
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-clay-100 shadow-[0_30px_60px_-35px_rgba(74,52,34,0.55)]">
            <Image src={image} alt={imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" style={{ objectPosition: imagePosition }} />
          </div>
        )}
      </div>
    </section>
  );
}

export function GuideSection({
  id,
  title,
  kicker,
  tone = "plain",
  children,
}: {
  id: string;
  title: React.ReactNode;
  kicker?: string;
  tone?: "plain" | "white" | "cream";
  children: React.ReactNode;
}) {
  const ground = tone === "white" ? "border-y border-clay-100 bg-white" : tone === "cream" ? "border-y border-clay-100 bg-cream-50/70" : "";
  return (
    <section id={id} className={`${ground} py-14 md:py-20`}>
      <div className="wide-shell grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
        <div className="min-w-0">
          {kicker && <p className="section-title mb-3">{kicker}</p>}
          <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">{title}</h2>
        </div>
        <div className="min-w-0 space-y-5 text-base leading-relaxed text-ink-700 [&_strong]:text-ink-900">{children}</div>
      </div>
    </section>
  );
}

export function GuideFigure({ src, alt, caption, position = "center" }: { src: string; alt: string; caption: React.ReactNode; position?: string }) {
  return (
    <figure className="overflow-hidden rounded-3xl border border-clay-100 bg-white">
      <div className="relative aspect-[3/2]">
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" style={{ objectPosition: position }} />
      </div>
      <figcaption className="px-5 py-3 text-sm leading-relaxed text-ink-600">{caption}</figcaption>
    </figure>
  );
}

export function GuideFaq({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  return (
    <div className="divide-y divide-clay-100 rounded-3xl border border-clay-100 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-lg font-bold text-ink-900">
            {item.q}
            <span className="mt-1 flex-none text-clay-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <div className="mt-2 text-base leading-relaxed text-ink-700">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/** The real prices, on every guide: answer engines and people both want them. */
export function GuideCta({ heading = "Try it on your own note" }: { heading?: string }) {
  return (
    <section id="try" className="py-14 md:py-20">
      <div className="wide-shell">
        <div className="grid gap-8 rounded-[2rem] bg-ink-900 p-8 text-paper md:p-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-balance md:text-4xl">{heading}</h2>
            <ul className="mt-5 space-y-2 text-base leading-relaxed text-cream-100">
              <li><strong className="text-paper">Free forever:</strong> 3 stories a month, no card.</li>
              <li><strong className="text-paper">Educator:</strong> unlimited stories, NZ$21 or A$19 a month, after a 7-day free trial.</li>
              <li><strong className="text-paper">Educator Pro:</strong> NZ$33 or A$29 a month, with child profiles, family translation and unlimited Quill.</li>
              <li><strong className="text-paper">Centres:</strong> one price for the team, from NZ$109 or A$99 a month for 10 educators.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream-100 px-6 text-base font-semibold text-ink-900 transition-colors hover:bg-paper">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/examples" className="inline-flex min-h-12 items-center justify-center rounded-full border border-cream-200/40 px-6 text-base font-semibold text-paper transition-colors hover:border-cream-100">
              Read 12 real drafts first
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RelatedGuides({ links }: { links: { href: string; title: string; body: string }[] }) {
  return (
    <section id="related" className="border-t border-clay-100 bg-cream-50/60 py-14">
      <div className="wide-shell">
        <h2 className="font-display text-2xl font-bold text-ink-900">Keep reading</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="group flex h-full flex-col rounded-3xl border border-clay-100 bg-paper p-5 transition-colors hover:border-clay-300">
                <span className="font-display text-lg font-bold text-ink-900 group-hover:text-clay-800">{link.title}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-ink-600">{link.body}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-clay-700">
                  Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export const RELATED = {
  whatIs: { href: "/what-is-a-learning-story", title: "What is a learning story?", body: "Where they came from, the three parts, and how they differ from an observation." },
  eylf: { href: "/eylf-learning-outcomes", title: "The 5 EYLF learning outcomes", body: "All 21 V2.0 sub-outcomes in plain English, with what each looks like in play." },
  template: { href: "/learning-story-template", title: "Learning story template", body: "Te Whāriki and EYLF versions to copy into Word, Canva or Storypark." },
  examples: { href: "/examples", title: "12 real learning story drafts", body: "Real notes and the drafts StoryLoop wrote from them, unedited." },
  accuracy: { href: "/accuracy", title: "The accuracy report", body: "How every draft is tested, and what we are still improving." },
  safety: { href: "/safety", title: "Children's information and AI", body: "Where information goes, what the AI can and cannot do with it, and your choices." },
  alongside: { href: "/works-alongside", title: "Works with Storypark", body: "Write in StoryLoop, share wherever your families already are." },
  vsStorypark: { href: "/storypark-alternative", title: "StoryLoop or Storypark?", body: "What each does, what each costs, and what switching looks like." },
  educators: { href: "/for-educators", title: "For educators", body: "From a quick note after play to a finished story, before you leave." },
  families: { href: "/for-families", title: "For families", body: "What you will see, in plain words and your own language." },
  centres: { href: "/for-centres", title: "For centres", body: "One price for the whole team, and consistent documentation." },
  teWhariki: { href: "/te-whariki-learning-outcomes-guide", title: "Te Whāriki learning outcomes", body: "The strands and outcomes, and how a story links to them honestly." },
} as const;
