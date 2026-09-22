import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computePublicStats, oneIn, MIN_EDUCATORS, MIN_STORIES, type PublicStats, type StatsRow } from "@/lib/public-stats";

// Recomputed once a day. The numbers move slowly, and a page that is cited
// should say exactly when its figures were produced.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Learning stories in numbers",
  description:
    "How early childhood educators in New Zealand and Australia use StoryLoop: note length, draft length, curriculum links and privacy checks, from real use, updated daily.",
  alternates: { canonical: "/learning-story-data" },
  openGraph: {
    title: "Learning stories in numbers",
    description: "Original, aggregate figures from real learning stories drafted with StoryLoop. Updated daily.",
    url: "https://storyloop.space/learning-story-data",
    type: "article",
  },
};

/**
 * Aggregates only. The rows are read on the server, reduced to counts and
 * medians by lib/public-stats.ts, and nothing else reaches the page: no text,
 * no names, no figure for any single educator or centre.
 */
async function loadStats(): Promise<{ stats: PublicStats | null; computedAt: Date }> {
  const computedAt = new Date();
  try {
    const admin = createAdminSupabase();
    const [{ data: internal }, { data: stories, error }] = await Promise.all([
      admin.from("profiles").select("id").eq("is_internal", true),
      admin
        .from("stories")
        .select("user_id, observations, story_text, outcomes, metadata")
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
    if (error || !stories) return { stats: null, computedAt };
    const skip = new Set((internal ?? []).map((row) => row.id as string));
    const rows: StatsRow[] = stories
      .filter((row) => !skip.has(row.user_id as string))
      .map((row) => {
        const metadata = (row.metadata ?? {}) as {
          privacyGuardian?: { issues?: unknown[] };
          assumptions?: unknown[];
          inputMethod?: string;
        };
        return {
          userId: row.user_id as string,
          observations: row.observations as string | null,
          storyText: row.story_text as string | null,
          hasCurriculumLinks: Array.isArray(row.outcomes) ? row.outcomes.length > 0 : Boolean(row.outcomes),
          privacyIssueCount: Array.isArray(metadata.privacyGuardian?.issues) ? metadata.privacyGuardian!.issues!.length : 0,
          assumptionCount: Array.isArray(metadata.assumptions) ? metadata.assumptions.length : 0,
          inputMethod: typeof metadata.inputMethod === "string" ? metadata.inputMethod : null,
        };
      });
    return { stats: computePublicStats(rows), computedAt };
  } catch {
    return { stats: null, computedAt };
  }
}

function wordCount(n: number) {
  return `${n} ${n === 1 ? "word" : "words"}`;
}

export default async function LearningStoryDataPage() {
  const { stats, computedAt } = await loadStats();
  const updated = computedAt.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" });

  return (
    <div className="min-h-screen bg-paper">
      <PageTracker />
      <Navbar />
      <main className="pb-20 pt-28 md:pt-32">
        <div className="reading-shell">
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 text-balance md:text-5xl">
            Learning stories in numbers
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
            What real use of StoryLoop shows about documentation in early childhood education, across New Zealand and
            Australia. Counts and medians only, recalculated every day.
          </p>
          <p className="mt-3 text-sm text-ink-500">Updated {updated}</p>

          {stats ? (
            <>
              <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-clay-100 bg-clay-100 md:grid-cols-3">
                {[
                  [stats.stories.toLocaleString("en-NZ"), "learning stories drafted"],
                  [stats.educators.toLocaleString("en-NZ"), "educators who wrote them"],
                  [wordCount(stats.medianNoteWords), "the typical educator note"],
                  [wordCount(stats.medianDraftWords), "the typical draft it became"],
                  [`${stats.withCurriculumLinks}%`, "linked to Te Whāriki or the EYLF"],
                  [`${stats.withPrivacyFlag}%`, "had something raised by the privacy check"],
                ].map(([value, label]) => (
                  // The label comes first in the markup (term, then value) and is
                  // shown under the number by ordering, so it is read once.
                  <div key={label} className="flex flex-col bg-paper p-5 md:p-6">
                    <dt className="order-2 mt-1 text-sm leading-snug text-ink-600">{label}</dt>
                    <dd className="order-1 font-display text-3xl font-bold tabular-nums text-ink-900 md:text-4xl">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-14 space-y-10 text-[17px] leading-relaxed text-ink-700">
                <section>
                  <h2 className="font-display text-2xl font-bold text-ink-900">How much does an educator need to write?</h2>
                  <p className="mt-3">
                    Less than most people expect. The typical note an educator writes or speaks into StoryLoop is{" "}
                    {wordCount(stats.medianNoteWords)}: a few lines jotted after play. The typical draft that comes back
                    is {wordCount(stats.medianDraftWords)}, with curriculum links, what the learning shows and next steps.
                    The educator then checks and edits it before anything is shared.
                  </p>
                </section>
                {stats.withPrivacyFlag > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold text-ink-900">How often does a note contain something that should not be shared?</h2>
                  <p className="mt-3">
                    In {stats.withPrivacyFlag}% of drafts{oneIn(stats.withPrivacyFlag) ? `, ${oneIn(stats.withPrivacyFlag)},` : ""} the
                    privacy check raised something for the educator to look at before sharing, such as another child
                    identified by name, diagnosis language or a sensitive family detail. Notes are written quickly in a
                    busy room, so these slips are normal. They are why every draft is checked before it can go anywhere.
                  </p>
                </section>
                )}
                <section>
                  <h2 className="font-display text-2xl font-bold text-ink-900">Does the AI decide what the learning was?</h2>
                  <p className="mt-3">
                    No. {stats.withAssumptionsRaised}% of drafts list the assumptions the draft had to make, for the
                    educator to confirm or correct, and {stats.withCurriculumLinks}% link to Te Whāriki or the EYLF only
                    where the note supports it. The educator who was there has the last word.
                  </p>
                </section>
                {stats.spoken > 0 && (
                  <section>
                    <h2 className="font-display text-2xl font-bold text-ink-900">Do educators type or talk?</h2>
                    <p className="mt-3">
                      Mostly type. {stats.spoken}% of notes were spoken rather than typed, which tends to happen when an
                      educator records a moment on the floor instead of writing it up later.
                    </p>
                  </section>
                )}
              </div>
            </>
          ) : (
            <p className="mt-10 rounded-2xl border border-clay-100 bg-cream-50 p-6 text-base leading-relaxed text-ink-700">
              These figures are only published once there are at least {MIN_STORIES} stories from at least {MIN_EDUCATORS}{" "}
              educators, so that no one person could be picked out of them. Check back soon.
            </p>
          )}

          <section className="mt-14 border-t border-clay-100 pt-8 text-base leading-relaxed text-ink-600">
            <h2 className="font-display text-xl font-bold text-ink-900">How these are counted</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Every learning story drafted in StoryLoop, excluding StoryLoop&apos;s own test accounts and drafts of the built-in example note.</li>
              <li>Word counts are medians, so a handful of very long or very short notes do not skew them.</li>
              <li>Only totals are published. No text, no names and no figure for any single educator or centre, and nothing at all below {MIN_STORIES} stories from {MIN_EDUCATORS} educators.</li>
              <li>
                For the wider picture, independent research found more than three in four Australian early childhood
                educators work about nine unpaid hours a week (
                <a
                  href="https://link.springer.com/article/10.1007/s13384-025-00847-z"
                  className="text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Harper, Wilson and McGrath-Champ, 2025
                </a>
                ).
              </li>
            </ul>
            <p className="mt-6">
              You are welcome to quote these figures with a link to this page. Questions:{" "}
              <a href="mailto:ariacareapp@gmail.com" className="text-clay-700 underline decoration-clay-300 underline-offset-2">
                ariacareapp@gmail.com
              </a>
              . See also{" "}
              <Link href="/how-long-should-a-learning-story-take" className="text-clay-700 underline decoration-clay-300 underline-offset-2">
                how long a learning story should take
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
