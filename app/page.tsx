import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import LiveDemo from "@/components/landing/LiveDemo";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Examples from "@/components/landing/Examples";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { LANDING_FAQS } from "@/lib/landing-faqs";

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
      <Navbar />
      <main>
        <Hero />
        <LiveDemo />
        <Features />
        <HowItWorks />
        <Examples />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
