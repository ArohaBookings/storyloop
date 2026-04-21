import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const sections = [
    { h: "1. Acceptance", p: "By creating an account you agree to these Terms. If you're using StoryLoop on behalf of a centre or organisation, you confirm you have authority to bind them." },
    { h: "2. What StoryLoop is", p: "StoryLoop generates draft learning stories from observations you provide. The stories are drafts — you must review, edit, and exercise your own professional judgement before publishing them to families or regulators. StoryLoop does not provide legal or educational advice." },
    { h: "3. Subscription and billing", p: "Paid plans are billed monthly in the currency you selected. A 7-day free trial applies to paid plans. You can cancel anytime from your Billing page — cancellation takes effect at the end of your billing period. We do not offer partial-month refunds except in exceptional circumstances at our discretion." },
    { h: "4. Your content", p: "You own all content you enter into StoryLoop (observations, child names, generated stories). We only use it to provide the service. You can export or delete it at any time." },
    { h: "5. Acceptable use", p: "Don't use StoryLoop to generate content involving children you don't have authority to document. Don't try to extract, reverse-engineer, or resell the underlying AI. Don't share your account with people outside your centre." },
    { h: "6. AI-generated content disclaimer", p: "All learning stories are drafts. You are responsible for their accuracy before publishing. StoryLoop is not liable for errors or omissions in generated content. Always review before sharing with families or regulators." },
    { h: "7. Service availability", p: "We aim for 99.5% uptime but cannot guarantee uninterrupted service. Planned maintenance will be announced where possible." },
    { h: "8. Liability", p: "To the maximum extent permitted by law, our liability is limited to the amount you paid in the 12 months prior to the claim. We are not liable for indirect or consequential damages. This does not affect your statutory rights under Australian Consumer Law or the NZ Consumer Guarantees Act." },
    { h: "9. Termination", p: "We may terminate accounts that violate these terms or engage in fraudulent activity. You can close your account at any time from Settings." },
    { h: "10. Governing law", p: "These terms are governed by the laws of New Zealand. Disputes will be resolved in New Zealand courts." },
    { h: "11. Contact", p: "Questions about these terms: hello@storyloop.app" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm text-clay-700 hover:underline mb-6 inline-block">← Back to home</Link>
          <h1 className="font-display text-5xl font-bold text-ink-900 mb-3">Terms of Service</h1>
          <p className="text-sm text-ink-500 mb-10">Last updated: {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
          <div className="space-y-7">
            {sections.map(s => (
              <div key={s.h}>
                <h2 className="font-display text-xl font-bold text-ink-900 mb-2">{s.h}</h2>
                <p className="text-ink-700 leading-relaxed">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
