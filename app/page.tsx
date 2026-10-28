import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HomeDemo from "@/components/landing/HomeDemo";
import ProofStrip from "@/components/landing/ProofStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import Examples from "@/components/landing/Examples";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { LANDING_FAQS } from "@/lib/landing-faqs";
import Reviews from "@/components/landing/Reviews";
import AccuracyProof from "@/components/landing/AccuracyProof";
import Founder from "@/components/landing/Founder";
import Audiences from "@/components/landing/Audiences";
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
        {/* The "whole day" features (wall cards, pickup brief, passports) moved
            to /features on 24 Sept 2026: in a 120-visitor panel, 109 said the
            homepage had too much text and dozens named that section as what
            buried the core story tool. */}
        {/* The order answers the questions in the order a visitor asks them:
            what is it (hero: a headline, one line and a photograph, minimal on
            every screen since 28 Oct 2026; then the demo, one scroll down),
            what does it cost (prices, straight after
            the demo since 28 Oct 2026: in July they were the 6th section and
            the instant buyers clicked a plan card; by October they were 9th),
            is the problem real and does it fit how I work (proof strip, how it
            works), will it make things up (accuracy), who is it for
            (audiences), show me (real examples), who is behind it (founder),
            then questions. Reviews renders nothing until a real review is
            published. */}
        <Hero />
        <HomeDemo />
        <Pricing audience="individuals" />
        <ProofStrip />
        <HowItWorks />
        <AccuracyProof />
        <Audiences />
        <Examples />
        <Founder />
        <Reviews />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
