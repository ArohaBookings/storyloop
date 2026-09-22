import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProofStrip from "@/components/landing/ProofStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import Capabilities from "@/components/landing/Capabilities";
import Examples from "@/components/landing/Examples";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { LANDING_FAQS } from "@/lib/landing-faqs";
import Reviews from "@/components/landing/Reviews";
import PageTracker from "@/components/analytics/PageTracker";

// Keep the landing static for speed, but regenerate every 5 minutes so a review
// published in the admin appears without waiting for a redeploy. Build stays
// safe with no database: the reviews read is guarded and returns empty.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "https://storyloop.space/" },
  openGraph: {
    url: "https://storyloop.space/",
    type: "website",
  },
};

// FAQPage structured data so search and answer engines can surface accurate
// answers about StoryLoop directly. Mirrors the visible FAQ on the page.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageTracker />
      <Navbar />
      <main>
        {/* Nine sections, down from fourteen (3,145 words to about 1,500).
            What left: the Today Loop band, two overlapping feature grids, the
            workload-statistics band, the who-it-is-for grid and the straight
            answers block. Their search value moved to /faq and the guide pages
            rather than disappearing. Reviews renders nothing until a real
            review is published. */}
        <Hero />
        <ProofStrip />
        <HowItWorks />
        <Capabilities />
        <Examples />
        <Reviews />
        <Pricing audience="individuals" />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
