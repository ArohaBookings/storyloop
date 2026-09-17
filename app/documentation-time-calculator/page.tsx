import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DocumentationTimeCalculator from "@/components/tools/DocumentationTimeCalculator";

export const metadata: Metadata = {
  title: "Documentation Time Calculator for Early Childhood Centres",
  description:
    "Work out how many hours your educators spend writing learning stories each month, what that time costs, and what a first draft would change. Free, no signup.",
  alternates: { canonical: "/documentation-time-calculator" },
  openGraph: {
    title: "How many hours does your centre spend on learning stories?",
    description: "Enter your team, children and minutes per story. See the hours and the cost, in NZD or AUD. Free, no signup.",
    url: "https://storyloop.space/documentation-time-calculator",
    type: "website",
  },
};

const FAQS = [
  {
    q: "How long does a learning story usually take to write?",
    a: "It varies a great deal. Written from a blank page, with the detail recalled later and curriculum wording found from scratch, many educators describe it as a half-hour job or more. Written soon after the moment from a note taken at the time, it is much quicker. That is why every figure in the calculator is yours to change.",
  },
  {
    q: "What should I use for the hourly cost?",
    a: "Use what an hour of educator time actually costs the service: the hourly rate plus on-costs, or what you pay to release someone for non-contact time. If documentation is being done unpaid at home, the cost is real too, it just shows up as tired staff instead of on the payroll.",
  },
  {
    q: "Is a centre plan cheaper than individual plans?",
    a: "Usually from about six educators. Centre Starter covers up to 10 educators for NZ$109 or A$99 a month and includes everything in Educator Pro for each of them, with unlimited children. The calculator compares the options for your team size.",
  },
  {
    q: "Does StoryLoop write the documentation for us?",
    a: "No. It turns an educator's own note or voice memo into a first draft with suggested curriculum links. The educator checks it, edits it and decides what is true before anything is shared.",
  },
];

export default function DocumentationTimeCalculatorPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main className="wide-shell pb-20 pt-28 sm:pt-32">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="section-title mb-3">Free for directors and owners</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">
            How many hours does your centre spend writing learning stories?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            Enter your team, your children and how long a story takes. See the hours each month, what that time costs, and
            what a first draft to edit would change. Your numbers, in NZD or AUD. No signup.
          </p>
        </header>

        <DocumentationTimeCalculator />

        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-ink-900">Questions directors ask</h2>
          <div className="mt-5 space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-ink-900">{faq.q}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-600">{faq.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs text-ink-500">Written by Leo, who builds StoryLoop, in Ōtautahi Christchurch</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
