import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Educator Resources",
  description:
    "Source-linked practical guides for EYLF, Te Whāriki, learning stories, planning cycles, educator reflection, and responsible AI in ECE.",
  alternates: { canonical: "/resources" },
};

const GUIDES = [
  {
    href: "/eylf-planning-cycle",
    kicker: "Australia",
    title: "EYLF planning cycle",
    description: "Move from observation to analysis, response, implementation, and reflection without checklist documentation.",
    icon: BookOpen,
  },
  {
    href: "/te-whariki-learning-outcomes-guide",
    kicker: "Aotearoa",
    title: "Te Whāriki learning outcomes",
    description: "Use strands, outcome ideas, dispositions, working theories, and assessment-for-learning accurately.",
    icon: Sparkles,
  },
  {
    href: "/responsible-ai-ece-documentation",
    kicker: "Practice guide",
    title: "Responsible AI in ECE documentation",
    description: "Keep evidence, child privacy, transparency, and educator professional judgement at the centre.",
    icon: ShieldCheck,
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-28">
        <section className="paper-texture pb-16">
          <div className="wide-shell">
            <p className="section-title mb-4">StoryLoop practice library</p>
            <h1 className="max-w-5xl font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl md:text-6xl">
              Practical ECE documentation guides, grounded in official sources.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-600">
              Built for educators who want clearer assessment, stronger curriculum links, and responsible AI support
              without generic theory or search-engine filler.
            </p>
          </div>
        </section>
        <section className="py-16">
          <div className="wide-shell grid gap-5 md:grid-cols-3">
            {GUIDES.map(({ href, kicker, title, description, icon: Icon }) => (
              <article key={href} className="card flex flex-col p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-clay-200 bg-cream-100">
                  <Icon className="h-5 w-5 text-clay-700" />
                </div>
                <p className="section-title mb-2">{kicker}</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{description}</p>
                <Link href={href} className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-clay-700">
                  Read guide <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
