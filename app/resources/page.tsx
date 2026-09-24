import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FileCheck, School, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import PageTracker from "@/components/analytics/PageTracker";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Educator Resources",
  description:
    "Source-linked practical guides for EYLF, Te Whāriki, learning stories, planning cycles, educator reflection, and responsible AI in ECE.",
  alternates: { canonical: "/resources" },
};

const GUIDES = [
  {
    href: "/what-is-a-learning-story",
    kicker: "Every educator · New",
    title: "What is a learning story?",
    description: "Notice, recognise, respond; where learning stories came from; how they differ from an observation; and a real example.",
    icon: BookOpen,
  },
  {
    href: "/learning-story-template",
    kicker: "Every educator · Free template",
    title: "Learning story template",
    description: "Te Whāriki and EYLF versions with a prompt under every heading, to copy into Word, Canva or Storypark.",
    icon: BookOpen,
  },
  {
    href: "/eylf-learning-outcomes",
    kicker: "Australia · New",
    title: "The 5 EYLF learning outcomes (V2.0)",
    description: "All 21 sub-outcomes in the framework's own words, with what each looks like in play.",
    icon: BookOpen,
  },
  {
    href: "/ero-early-childhood-regulation-2026",
    kicker: "Owners · Aotearoa · New",
    title: "ERO now regulates early childhood",
    description: "From 1 September 2026 ERO licenses and reviews you, after April's rewrite of the licensing criteria. What changed, and how to keep documentation ready.",
    icon: ShieldCheck,
  },
  {
    href: "/acecqa-documentation-guidance",
    kicker: "Approved providers · Australia",
    title: "What ACECQA says you do not have to document",
    description: "No quotas per child, no photo on every record, no outcome codes on every observation. What the law requires, and what ACECQA calls misconceptions.",
    icon: BookOpen,
  },
  {
    href: "/assessment-and-rating-evidence",
    kicker: "Directors · A&R visit",
    title: "The evidence to have ready",
    description: "Regulatory authorities generally give one to five days' notice. What Standard 1.3 evidence to have ready, and the gaps that surface under time pressure.",
    icon: FileCheck,
  },
  {
    href: "/transition-to-school-statement",
    kicker: "Term 4",
    title: "Transition to school statements",
    description: "What Victoria, NSW and Queensland ask for, how Aotearoa differs, and how to have the evidence ready before November.",
    icon: School,
  },
  {
    href: "/nqs-standard-1-3-assessment-and-planning",
    kicker: "Directors · Australia",
    title: "NQS Standard 1.3 documentation",
    description: "What ACECQA's guidance says assessors look for in the planning cycle, critical reflection and information for families.",
    icon: BookOpen,
  },
  {
    href: "/review-readiness-check",
    kicker: "Free tool · 2 minutes",
    title: "Review visit readiness check",
    description: "Ten honest questions about your documentation. See the gaps a review conversation would surface, in the order to fix them. Nothing leaves your browser.",
    icon: FileCheck,
  },
  {
    href: "/ai-policy",
    kicker: "Free tool",
    title: "AI policy for your service",
    description: "Answer a few questions and get a responsible AI in documentation policy your service can adopt. No signup.",
    icon: FileCheck,
  },
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
      <PageTracker />
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
