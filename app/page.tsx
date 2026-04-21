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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
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
