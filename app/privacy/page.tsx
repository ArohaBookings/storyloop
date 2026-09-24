import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { CookiePreferencesButton } from "@/components/consent/CookieBanner";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "StoryLoop privacy policy for early childhood educators using learning story drafts across Australia and New Zealand.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "StoryLoop Privacy Policy",
    description: "How StoryLoop handles account, subscription, observation, and generated learning story data.",
    url: "https://storyloop.space/privacy",
    type: "article",
  },
};

export default function PrivacyPage() {
  // Rewritten 23 September 2026 so that every sentence is true of the product
  // as built. The previous version said personal data never left Australia and
  // New Zealand (story drafts are written by OpenAI or Anthropic in the United
  // States), claimed signed processing agreements, promised an
  // automatic 90-day deletion that did not exist, and showed today's date as
  // "last updated" on every visit.
  const sections: { h: string; p: string; id?: string }[] = [
    { h: "1. Overview", p: "StoryLoop ('we', 'us') is a product of Aria Care, a New Zealand business, built in New Zealand and used across Australia and New Zealand. This policy explains what we collect when you use StoryLoop, why, who else handles it, and what you can ask us to do with it." },
    { h: "2. What we collect", p: "Account information: your name, email address and a hashed password. Subscription information: your plan and billing status. Payments are handled by Stripe, and we never see or store your card details. The observations you write or record, the learning stories drafted from them, and the child profiles you choose to create. Usage information: which pages you visit and which features you use, so we can see what works and fix what does not. How much of this we record depends on your cookie choice (section 10)." },
    { h: "3. Children's information", p: "Anything about a child is treated as sensitive. It is stored in our database in Sydney, Australia. We ask for first names only and recommend leaving out surnames and other identifying details. We never use children's information to train AI models, and we never sell it or use it for advertising. When a child records their own words, StoryLoop does not keep the recording. Wall cards shared with families carry no names, photographs or dates. You can delete any child profile or story at any time." },
    { h: "4. AI processing", p: "To draft a story, your observation is sent to our AI provider, OpenAI or Anthropic, in the United States. A voice note is sent to OpenAI to be transcribed. Under their business terms these providers do not use what we send them to train their models, and keep it only for a limited period for safety monitoring. Every draft is yours to check and edit before it is shared anywhere." },
    { h: "5. Who else handles information", p: "Supabase stores our database, on Amazon Web Services in Sydney, Australia. Vercel hosts the website and runs our servers. Stripe processes payments. Resend delivers our emails. OpenAI and Anthropic draft stories and transcribe voice notes. If you arrive from a Facebook or Instagram link and sign up, and we are measuring our ads at the time, we tell Meta that the sign-up happened: we send the click identifier Facebook added to that link, your browser type, and a scrambled account number, and nothing else. Nothing about the children you teach is ever sent to Meta or used for advertising." },
    { h: "6. Information processed overseas", p: "Your stored records stay in Sydney, but some of these providers are based in, or process data in, the United States, so some of your information is handled outside Australia and New Zealand while it is being processed. We use providers bound by contract terms that require them to protect it, in line with the New Zealand Privacy Act 2020 (principle 12) and the Australian Privacy Principles (APP 8)." },
    { h: "7. Security", p: "Information is encrypted in transit and at rest. Database rules mean each account can only reach its own records. Passwords are stored as one-way hashes. Access to production systems is limited to the people who run StoryLoop." },
    { h: "8. Your rights", p: "You can ask to see, correct or delete your personal information at any time by emailing ariacareapp@gmail.com. We respond within 30 days. You can export your stories from your account whenever you like." },
    { h: "9. Keeping and deleting information", p: "If you cancel, your account and stories stay available so you can come back or export them. If you would like everything deleted, email us and we will delete your account, stories and child profiles within 30 days. Backups are overwritten on a rolling cycle after that." },
    { id: "cookies", h: "10. Cookies and analytics", p: "The first time you visit, we ask whether we can use analytics cookies. Either answer works, and you can change it any time with \"Cookie preferences\" at the bottom of every page or the button below. We do not use advertising cookies, and there are no third-party trackers or pixels on our pages." },
    { h: "11. Complaints", p: "If you are unhappy with how we have handled your information, tell us first and we will try to put it right. You can also complain to the Office of the Privacy Commissioner in New Zealand or the Office of the Australian Information Commissioner." },
    { h: "12. Contact", p: "Privacy questions: ariacareapp@gmail.com. StoryLoop is part of Aria Care, based in Ōtautahi Christchurch, New Zealand." },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="reading-shell">
          <Link href="/" className="text-sm text-clay-700 hover:underline mb-6 inline-block">← Back to home</Link>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-ink-500 mb-10">Last updated: 24 September 2026</p>
          <div className="space-y-7">
            {sections.map(s => (
              <div key={s.h} id={s.id} className="scroll-mt-28">
                <h2 className="font-display text-xl font-bold text-ink-900 mb-2">{s.h}</h2>
                <p className="text-ink-700 leading-relaxed">{s.p}</p>
                {s.id === "cookies" && <CookieDetails />}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const COOKIE_ROWS = [
  { name: "Sign-in (sb-…)", when: "Always", what: "Keeps you signed in. Set by Supabase, our database." },
  { name: "sl_consent", when: "Always", what: "Remembers your cookie choice, for a year." },
  { name: "storyloop_ref", when: "Always", what: "A colleague's referral code from their link, so they are credited when you sign up." },
  { name: "Tab id and where you came from", when: "Essential only", what: "A random id and the site or link that sent you, kept in this browser tab only and gone when you close it. Used to count visits and sign-ups." },
  { name: "storyloop_sid, storyloop_attr, storyloop_visitor", when: "Only if you allow", what: "The same, kept between visits, plus how many times you have visited." },
  { name: "Stripe", when: "At checkout", what: "Stripe sets its own cookies on its payment page to prevent fraud." },
];

function CookieDetails() {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-clay-100 bg-cream-50 p-5">
          <h3 className="font-display text-lg font-bold text-ink-900">Essential only</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
            We count page views and the steps of signing up and paying, so we know the site works and where visitors
            come from. Nothing about what you click or read, your screen or your device, and nothing that links one
            visit to the next.
          </p>
        </div>
        <div className="rounded-2xl border border-clay-100 bg-cream-50 p-5">
          <h3 className="font-display text-lg font-bold text-ink-900">If you allow analytics</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
            As well: which buttons and links you use, how far you read, how long each part of a page holds you, where
            a form was left unfinished (field names only, never what you typed), what you copy (how much, never the
            text), page speed, errors, your screen size, language, time zone and browser, and whether you have visited
            before.
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink-700">
        Either way, it all stays with us: stored in Sydney, never sold, never used for advertising. Inside your
        account we record which pages and named buttons you use, never the words of a story or a child&apos;s details.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-clay-100">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">When</th><th className="px-4 py-3">What it is for</th></tr>
          </thead>
          <tbody className="divide-y divide-clay-100">
            {COOKIE_ROWS.map((row) => (
              <tr key={row.name}>
                <td className="px-4 py-3 font-mono text-xs text-ink-800">{row.name}</td>
                <td className="px-4 py-3 text-ink-700">{row.when}</td>
                <td className="px-4 py-3 text-ink-700">{row.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CookiePreferencesButton className="btn-secondary" />
    </div>
  );
}
