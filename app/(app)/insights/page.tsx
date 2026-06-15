import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Compass, RefreshCw, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildStoryInsights } from "@/lib/story-insights";

export const metadata = { title: "Learning threads" };

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: stories } = await supabase
    .from("stories")
    .select("id, child_name, outcomes, next_steps, metadata, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const insights = buildStoryInsights(stories ?? []);
  const maxDisposition = Math.max(...insights.dispositions.map((item) => item.count), 1);
  const maxCurriculum = Math.max(...insights.curriculum.map((item) => item.count), 1);

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Learning over time</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">Learning threads</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            See recurring dispositions, curriculum links, and follow-up opportunities across saved stories.
            These patterns support reflection; they are not developmental scores.
          </p>
        </div>
        <Link href="/generate" className="btn-primary">
          <Sparkles className="h-4 w-4" /> New observation
        </Link>
      </div>

      {!insights.totalStories ? (
        <div className="card p-12 text-center">
          <Brain className="mx-auto mb-4 h-12 w-12 text-clay-300" />
          <h2 className="font-display text-xl font-bold text-ink-900">Patterns appear after your first stories</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            StoryLoop will use your saved metadata to show learning threads without judging or ranking children.
          </p>
          <Link href="/generate" className="btn-primary mt-5">
            Write first story <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Saved stories", value: insights.totalStories, icon: BookOpen },
              { label: "Learning threads", value: insights.children.length, icon: Users },
              { label: "Educator reflections", value: insights.reflectedStories, icon: CheckCircle2 },
              { label: "Responses revisited", value: insights.revisitedStories, icon: RefreshCw },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card p-4">
                <Icon className="mb-3 h-4 w-4 text-clay-700" />
                <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
                <p className="mt-1 text-xs text-ink-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="section-title mb-1">Disposition signals</p>
                  <h2 className="font-display text-2xl font-bold text-ink-900">What keeps showing up?</h2>
                </div>
                <Brain className="h-5 w-5 text-clay-500" />
              </div>
              <div className="space-y-4">
                {insights.dispositions.length ? (
                  insights.dispositions.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold capitalize text-ink-700">{item.label}</span>
                        <span className="font-mono text-ink-500">{item.count} stories</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-100">
                        <div
                          className="h-full rounded-full bg-clay-600"
                          style={{ width: `${Math.max((item.count / maxDisposition) * 100, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">Newer stories will add disposition signals here.</p>
                )}
              </div>
            </section>

            <section className="card p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="section-title mb-1">Curriculum pattern</p>
                  <h2 className="font-display text-2xl font-bold text-ink-900">Coverage, not compliance.</h2>
                </div>
                <Compass className="h-5 w-5 text-clay-500" />
              </div>
              <div className="space-y-4">
                {insights.curriculum.length ? (
                  insights.curriculum.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="line-clamp-1 font-semibold text-ink-700">{item.label}</span>
                        <span className="flex-shrink-0 font-mono text-ink-500">{item.count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-100">
                        <div
                          className="h-full rounded-full bg-sage-600"
                          style={{ width: `${Math.max((item.count / maxCurriculum) * 100, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">Curriculum links will build as stories are saved.</p>
                )}
              </div>
            </section>
          </div>

          <section className="mt-5 card overflow-hidden">
            <div className="border-b border-clay-100 p-5">
              <p className="section-title mb-1">Child-by-child continuity</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">Threads worth revisiting</h2>
              <p className="mt-1 text-xs text-ink-500">
                Names come from your own story labels. StoryLoop does not compare children with each other.
              </p>
            </div>
            <div className="divide-y divide-clay-100">
              {insights.children.map((child) => (
                <div key={child.name} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink-900">{child.name}</h3>
                      <p className="mt-1 text-xs text-ink-500">
                        {child.storyCount} {child.storyCount === 1 ? "story" : "stories"} · latest{" "}
                        {new Date(child.latestDate).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {child.dispositions.map((item) => (
                          <span key={item.label} className="rounded-full bg-cream-100 px-2 py-1 text-[10px] font-semibold capitalize text-clay-700">
                            {item.label} · {item.count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-[170px] rounded-2xl border border-clay-100 bg-cream-50 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-600">Story continuity</span>
                        <span className="font-bold text-clay-700">
                          {percentage(Math.min(child.storyCount, 4), 4)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-clay-600"
                          style={{ width: `${percentage(Math.min(child.storyCount, 4), 4)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-ink-500">
                        {child.openNextSteps} response ideas captured across this thread.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-5 rounded-3xl border border-clay-200 bg-cream-50 p-5">
            <p className="text-sm font-semibold text-ink-800">
              {insights.openFollowUps > 0
                ? `${insights.openFollowUps} stories have an open follow-up prompt. Revisit one from Story history when the next moment happens.`
                : "Add educator reflections in Story history to strengthen your planning loop."}
            </p>
            <Link href="/history" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-clay-700">
              Open story history <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
