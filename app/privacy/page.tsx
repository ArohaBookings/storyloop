import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const sections = [
    { h: "1. Overview", p: "StoryLoop ('we', 'us') is a product of Aria Care Ltd, built in New Zealand and operating across Australia and New Zealand. This policy explains how we collect, use, and protect information when you use StoryLoop to generate learning stories." },
    { h: "2. What we collect", p: "Account information (name, email, password hash). Subscription and payment information, processed securely through Stripe — we never store your card details. The observations you enter and the learning stories we generate for you. Usage metadata (number of stories, which features you use) for billing and product improvement." },
    { h: "3. Children's information", p: "If you enter a child's first name or age into StoryLoop, that information is treated as sensitive. We store it encrypted, in Australian data centres (Sydney region via Supabase on AWS ap-southeast-2). We never use this data to train AI models. You can delete any child profile or story at any time." },
    { h: "4. AI processing", p: "When you generate a story, your observations are sent to our AI provider (OpenAI or Anthropic) for processing. These providers have signed data processing agreements with us; they do not use your data to train their models. We recommend avoiding full names or identifying details in observations." },
    { h: "5. Data storage and security", p: "All data encrypted in transit (TLS 1.3) and at rest (AES-256). Row-level security ensures each user can only access their own data. Passwords hashed with bcrypt. Regular security reviews." },
    { h: "6. Your rights", p: "You can access, correct, or delete your personal data at any time by emailing privacy@storyloop.app. We respond within 30 days. You may also export all your stories from your dashboard." },
    { h: "7. Cancellation and data retention", p: "When you cancel your subscription, we retain your data for 90 days so you can export it. After 90 days, all data is permanently deleted from our systems. Backups are retained for 30 days after deletion." },
    { h: "8. Cookies", p: "We use essential cookies for authentication and session management. We do not use advertising cookies or third-party trackers." },
    { h: "9. Compliance", p: "Compliant with the Australian Privacy Act 1988 and the New Zealand Privacy Act 2020. We do not transfer personal data outside of Australia and New Zealand." },
    { h: "10. Contact", p: "Privacy questions: privacy@storyloop.app. StoryLoop is a division of Aria Care, based in New Zealand." },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm text-clay-700 hover:underline mb-6 inline-block">← Back to home</Link>
          <h1 className="font-display text-5xl font-bold text-ink-900 mb-3">Privacy Policy</h1>
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
