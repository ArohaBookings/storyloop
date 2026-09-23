import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import PageTracker from "@/components/analytics/PageTracker";
import Footer from "@/components/landing/Footer";
import ReviewReadinessCheck from "@/components/tools/ReviewReadinessCheck";

export const metadata: Metadata = {
  title: "Review Visit Readiness Check for Early Childhood Services",
  description:
    "Ten honest questions about your documentation, answered in two minutes. See the gaps a review conversation would surface, in the order to fix them. Free, no signup.",
  alternates: { canonical: "/review-readiness-check" },
  openGraph: {
    title: "Would your documentation hold up if the call came tomorrow?",
    description: "Ten questions, two minutes, nothing sent anywhere. The gaps a review conversation would surface, in the order to fix them.",
    url: "https://storyloop.space/review-readiness-check",
    type: "website",
  },
};

const FAQS = [
  {
    q: "How much notice does a service get before an assessment and rating visit?",
    a: "ACECQA's process page says regulatory authorities generally provide one to five days' notice that a site visit will occur. An assessment that commences in response to compliance issues may commence without notice. That is the reason this check is worth doing in a quiet month rather than a busy one.",
  },
  {
    q: "Is this a compliance rating?",
    a: "No, and treat anything claiming to be one with suspicion. This reflects your own answers back to you in priority order. It has no access to your service, produces no score, and predicts nothing about an assessment outcome.",
  },
  {
    q: "Where do my answers go?",
    a: "Nowhere. The questions are answered in your browser, nothing is sent to a server, and there is no signup. Close the tab and it is gone, which is why it is safe to answer question two honestly.",
  },
  {
    q: "Does it apply in Aotearoa as well as Australia?",
    a: "The questions are about documentation practice, so both. ERO works from a service's own internal evaluation against Te Whāriki, and the underlying questions land in the same place: what you noticed, what you did about it, what happened, and how whānau contributed.",
  },
  {
    q: "We found gaps. What now?",
    a: "Take the top two to your next staff meeting with the first moves attached. Most gaps here are recording gaps rather than practice gaps, which means the thinking already happened and nobody wrote it down.",
  },
];

export default function ReviewReadinessCheckPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
  };

  return (
    <div className="min-h-screen bg-paper">
      <PageTracker />
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main className="wide-shell pb-20 pt-28 sm:pt-32">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="section-title mb-3">Free for directors and owners</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">
            Would your documentation hold up if the call came tomorrow?
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            Regulatory authorities generally give one to five days&apos; notice of a site visit. Ten honest questions, two
            minutes, and nothing leaves your browser. You get the gaps a review conversation would surface, in the order
            worth fixing them.
          </p>
        </header>

        <ReviewReadinessCheck />

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
          <p className="mt-6 text-sm leading-relaxed text-ink-600">
            Longer reading:{" "}
            <Link href="/assessment-and-rating-evidence" className="underline underline-offset-2 hover:text-ink-900">
              the evidence to have ready
            </Link>{" "}
            and{" "}
            <Link href="/nqs-standard-1-3-assessment-and-planning" className="underline underline-offset-2 hover:text-ink-900">
              what Standard 1.3 asks for
            </Link>
            .
          </p>
          <p className="mt-8 text-xs text-ink-500">Written by Leo, who builds StoryLoop, in Ōtautahi Christchurch</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
