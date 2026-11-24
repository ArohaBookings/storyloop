import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import AnimatedLogo from "@/components/brand/AnimatedLogo";
import { LEADER_EMAIL_ON } from "@/lib/build-switches";
import Footer from "@/components/landing/Footer";
import LeaderCheckPage from "@/components/marketing/LeaderCheckPage";
import PageTracker from "@/components/analytics/PageTracker";

/**
 * Where a leader checks one story an educator sent them (lib/story-check.ts).
 * The page itself is the same for everyone and holds nothing: the story is
 * fetched in the browser with the key that sits after the # in the link.
 * Kept out of search engines; there is nothing here for them.
 */
export const metadata: Metadata = {
  title: "Check a learning story",
  description: "An educator has asked you to check a learning story before it goes to families.",
  robots: { index: false, follow: false },
};

export default function CheckPage() {
  return (
    <>
      {/* The visit and taps only: the story and the note are never recorded. */}
      <PageTracker mode="private" />
      {/* 25 Nov 2026: the logo only, so nothing competes with the one job on this page. Off: the site's own bar. */}
      {LEADER_EMAIL_ON ? <CheckHeader /> : <Navbar />}
      <main className={`bg-cream-50/60 pb-16 ${LEADER_EMAIL_ON ? "pt-6 sm:pt-10" : "pt-24 sm:pt-28"}`}>
        <LeaderCheckPage />
      </main>
      <Footer />
    </>
  );
}

function CheckHeader() {
  return (
    <header className="border-b border-clay-100 bg-paper" data-testid="check-header">
      <div className="edge-shell flex h-14 items-center">
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <AnimatedLogo size={28} />
          <span className="font-display text-lg font-bold tracking-tight text-ink-800">StoryLoop</span>
        </Link>
      </div>
    </header>
  );
}
