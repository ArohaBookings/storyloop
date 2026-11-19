import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import CheckMyStory from "@/components/marketing/CheckMyStory";
import { CHECK_MY_STORY_PUBLIC } from "@/lib/check-my-story-limits";

export const metadata: Metadata = CHECK_MY_STORY_PUBLIC
  ? {
      title: "Check my learning story",
      description:
        "Paste a learning story and the note behind it. See what a leader would query: the child's own words, curriculum links the note backs up, first names only, and anything made up. Free, nothing kept.",
      alternates: { canonical: "/check-my-story" },
      openGraph: {
        title: "Check my learning story",
        description: "Paste a story and its note. See what a leader would query, in seconds. Nothing you paste is kept.",
        url: "https://storyloop.space/check-my-story",
        type: "website",
      },
    }
  : // Held (lib/check-my-story-limits.ts): the address answers 404 and is never indexed.
    { robots: { index: false, follow: false } };

/**
 * Check my story (19 Nov 2026), for educators and leaders who already write
 * learning stories: paste one and the note behind it, see what a leader would
 * query. The same deterministic check a leader sees in StoryLoop's team review
 * queue (lib/check-my-story.ts). Not a template and not an example list.
 *
 * HELD until January (CHECK_MY_STORY_PUBLIC): while it is off this address is
 * a 404, it is not in the sitemap and nothing links to it.
 *
 * PageTracker in private mode: people paste stories about real children here,
 * so the visit and taps are counted and nothing on the page is.
 */
export default function CheckMyStoryPage() {
  if (!CHECK_MY_STORY_PUBLIC) notFound();
  return (
    <div className="min-h-screen bg-paper">
      <PageTracker mode="private" />
      <Navbar />
      <main className="wide-shell pb-20 pt-28 sm:pt-32">
        <header className="mx-auto mb-6 max-w-2xl">
          <p className="section-title mb-2">For educators and leaders</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">Check my story</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-600" data-testid="check-what-it-does">
            Paste a learning story and the note behind it, and see in seconds what a leader would query.
          </p>
        </header>
        <CheckMyStory />
      </main>
      <Footer />
    </div>
  );
}
