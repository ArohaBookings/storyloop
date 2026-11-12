import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PrintButton from "@/components/app/PrintButton";
import { PLAN_DEFINITIONS } from "@/lib/plans";
import { CENTRE_TRIAL_DAYS } from "@/lib/centre-offer";

/**
 * The data sheet (12 Nov 2026): one printable page a director hands to the
 * owner, board or approved provider who has to see where children's
 * information goes before anyone spends money. No centre has ever bought
 * StoryLoop, and an Australian director cannot spend without this.
 *
 * Every row restates a page that already exists, in that page's own words
 * where it is legal wording. Change the source first, then this row:
 *   operator      app/privacy (1, 12), app/about (facts list), Footer
 *   does          lib/site-identity.ts SITE_DESCRIPTION, app/safety (journey 5)
 *   does not      app/about (principle 1), lib/family-link.ts (no photographs)
 *   goes in       app/privacy (2, 3), app/safety (journey 1, FAQs)
 *   never put in  app/safety (FAQ "Is it safe to use children's names?", photo FAQ)
 *   stored        app/privacy (3, 5, 7)
 *   services      app/privacy (4, 5, 6)
 *   training      app/privacy (3, 4)
 *   drafts        lib/plans.ts (centre feature line), lib/centres.ts, lib/story-check.ts, lib/family-link.ts
 *   export        components/app/DownloadEverything.tsx, app/about (facts list)
 *   delete        app/safety (FAQ "Can we delete everything?"), app/privacy (9)
 *   billing       app/terms (3, 10), lib/centre-offer.ts, components/centre/FoundingCentreOffer.tsx, lib/centres.ts
 *   price         lib/plans.ts, components/landing/Pricing.tsx (GST inclusive)
 *   privacy law   app/privacy (6, 11)
 */

export const metadata: Metadata = {
  title: { absolute: "StoryLoop data sheet" },
  description:
    "One printable page for owners, boards and approved providers: who runs StoryLoop, what goes in, where it is stored, who processes it, export, deletion and price.",
  alternates: { canonical: "/data-sheet" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "StoryLoop data sheet",
    description: "For owners, boards and approved providers: where children's information goes, on one page.",
    url: "https://storyloop.space/data-sheet",
    type: "article",
  },
};

function centrePrice(key: "centre_starter" | "centre_growth") {
  const plan = PLAN_DEFINITIONS.find((p) => p.key === key)!;
  return `${plan.name}: NZ$${plan.price.NZD} or A$${plan.price.AUD} a month, up to ${plan.seats} educators`;
}

type Row = { label: string; lines: ReactNode[] };

const ROWS: Row[] = [
  {
    label: "Who operates it",
    lines: [
      "StoryLoop is a product of Aria Care, a New Zealand business, based in Ōtautahi Christchurch, New Zealand.",
      <>
        Contact:{" "}
        <a href="mailto:ariacareapp@gmail.com" className="break-all text-clay-700 underline underline-offset-2">ariacareapp@gmail.com</a>
        {" "}· storyloop.space
      </>,
      "The terms are governed by the laws of New Zealand.",
    ],
  },
  {
    label: "What it does",
    lines: [
      "Turns an early childhood educator's own observation note into an editable learning story draft, linked to Te Whāriki or the EYLF, that the educator checks before anything is shared.",
      "Nothing goes to a family, a wall or anyone else until an educator chooses.",
    ],
  },
  {
    label: "What it does not do",
    lines: [
      "It does not publish, it does not send, and it does not decide what is true about a child.",
      "No photo or video sharing, no daily diary, and no rolls, fees or subsidy admin.",
    ],
  },
  {
    label: "What goes in",
    lines: [
      "Children's first names, the educator's note (written or recorded), the learning story drafted from it, and the child profiles an educator chooses to create.",
      "For the account: the educator's name, email address and a hashed password.",
      "A voice memo is turned into text and not kept as audio. A photo of written notes is read into text and not kept.",
    ],
  },
  {
    label: "What never to put in",
    lines: [
      "Surnames, dates of birth, addresses and anything clinical. The privacy check flags identifiers like these if they slip into a note.",
      "Photograph your notes only, never children.",
    ],
  },
  {
    label: "Where it is stored",
    lines: [
      "In StoryLoop's database in Sydney, Australia (Supabase, on Amazon Web Services).",
      "Encrypted in transit and at rest. Passwords are stored as one-way hashes. Access to production systems is limited to the people who run StoryLoop.",
    ],
  },
  {
    label: "Outside services",
    lines: [
      "Supabase: stores the database, on Amazon Web Services in Sydney.",
      "Vercel: hosts the website and runs the servers.",
      "OpenAI or Anthropic, in the United States: draft stories. OpenAI transcribes voice notes and reads photos of written notes.",
      "Stripe: processes payments. StoryLoop never sees or stores card details.",
      "Resend: delivers emails.",
      "Ads: if someone arrives from one of StoryLoop's ads and signs up, Meta or Google is told that it happened. Nothing about the children you teach is ever sent to them.",
      "Some of these providers process data in the United States, under contract terms that require them to protect it.",
    ],
  },
  {
    label: "Training AI",
    lines: [
      "Children's information is never used to train AI models, never sold and never used for advertising.",
      "Under their business terms the AI providers do not use what is sent to them to train their models, and keep it only for a limited period for safety monitoring.",
    ],
  },
  {
    label: "Who sees an educator's drafts",
    lines: [
      "Educators keep their drafts private unless they choose to share. Sharing is off by default and only the educator can turn it on.",
      "A centre leader sees activity (how many stories, when last written), never content they were not given.",
      "A leader check link opens one story for 14 days. A Family link opens only the stories an educator chose to share about one child. Both can be cancelled.",
    ],
  },
  {
    label: "Export",
    lines: [
      "Every educator can download everything they have written from the History page, as a text file or a spreadsheet (CSV).",
      "Editable and exportable at any time, on every plan, including after you cancel.",
    ],
  },
  {
    label: "Deletion",
    lines: [
      "Delete any story or child profile yourself at any time.",
      "Or email ariacareapp@gmail.com and the whole account, stories and child profiles are deleted within 30 days. Backups are overwritten on a rolling cycle after that.",
    ],
  },
  {
    label: "Billing",
    lines: [
      "Billed monthly by Stripe, in New Zealand or Australian dollars. No contract and no per-child fee.",
      `Centre plans start with at least ${CENTRE_TRIAL_DAYS} days free, no card. If no card is added by the end, nothing is charged and the account drops back to the free plan with everything kept.`,
      "Cancel any time from the Billing page; cancellation takes effect at the end of the billing period. Only the centre's owner can change billing.",
    ],
  },
  {
    label: "Price",
    lines: [
      `${centrePrice("centre_starter")}.`,
      `${centrePrice("centre_growth")}.`,
      "Unlimited children on both. All prices GST inclusive.",
    ],
  },
  {
    label: "Privacy law",
    lines: [
      "The New Zealand Privacy Act 2020 and the Australian Privacy Principles. Complaints can go to the Office of the Privacy Commissioner in New Zealand or the Office of the Australian Information Commissioner.",
    ],
  },
];

export default function DataSheetPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="pb-16 pt-28 sm:pt-32 print:p-0">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 print:max-w-none print:px-0">
          <header className="flex flex-col gap-4 border-b border-clay-100 pb-5 sm:flex-row sm:items-end sm:justify-between print:pb-2">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl print:text-2xl">StoryLoop data sheet</h1>
              <p className="mt-1 text-base text-ink-600 print:text-sm">For owners, boards and approved providers</p>
            </div>
            <div className="print:hidden" data-testid="data-sheet-print">
              <PrintButton label="Print this page" />
            </div>
          </header>

          <dl className="divide-y divide-clay-100" data-testid="data-sheet-rows">
            {ROWS.map((row) => (
              <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6 print:grid-cols-[9.5rem_1fr] print:gap-4 print:py-1.5 print:break-inside-avoid">
                <dt className="text-sm font-semibold text-ink-900 print:text-[10pt]">{row.label}</dt>
                <dd className="min-w-0 space-y-1 text-[15px] leading-relaxed text-ink-700 print:space-y-0 print:text-[9pt] print:leading-snug">
                  {row.lines.map((line, index) => (
                    <p key={index} className="break-words">{line}</p>
                  ))}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 border-t border-clay-100 pt-4 text-sm leading-relaxed text-ink-500 print:mt-2 print:pt-2 print:text-[8pt]">
            Each line restates StoryLoop&apos;s{" "}
            <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>,{" "}
            <Link href="/terms" className="underline underline-offset-2">terms</Link> and{" "}
            <Link href="/safety" className="underline underline-offset-2">children&apos;s information and AI</Link> pages, which
            give the full wording. storyloop.space/data-sheet
          </p>

          <p className="mt-6 print:hidden">
            <Link href="/for-centres" className="text-sm font-semibold text-clay-700 underline underline-offset-2">
              StoryLoop for centres
            </Link>
          </p>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
