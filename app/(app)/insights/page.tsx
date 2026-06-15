import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Compass, RefreshCw, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buildStoryInsights } from "@/lib/story-insights";
import { buildCurriculumCompass } from "@/lib/curriculum-compass";
import { normalizeFramework } from "@/lib/story-options";

export const metadata = { title: "Learning threads" };

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child: requestedChildId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: stories }, { data: childProfiles }] = await Promise.all([
    supabase
      .from("stories")
      .select("id, child_id, child_name, outcomes, next_steps, metadata, location, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("child_profiles")
      .select("id, name, age_group, interests, whanau_aspirations")
      .eq("user_id", user.id)
      .order("name"),
  ]);

  const selectedChild = (childProfiles ?? []).find((child) => child.id === requestedChildId);
  const selectedStories = selectedChild
    ? (stories ?? []).filter((story) => story.child_id === selectedChild.id)
    : stories ?? [];
  const insights = buildStoryInsights(selectedStories);
  const framework = normalizeFramework(selectedStories[0]?.location);
  const compass = buildCurriculumCompass(framework, selectedStories);
  const maxCompass = Math.max(...compass.map((item) => item.count), 1);
  const maxDisposition = Math.max(...insights.dispositions.map((item) => item.count), 1);
  const maxCurriculum = Math.max(...insights.curriculum.map((item) => item.count), 1);

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-2">Learning over time</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            {selectedChild ? `${selectedChild.name}'s learning thread` : "Learning threads"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">
            See recurring dispositions, curriculum links, and follow-up opportunities across saved stories.
            These patterns support reflection; they are not developmental scores.
          </p>
        </div>
        <Link
          href={selectedChild ? `/generate?child=${encodeURIComponent(selectedChild.id)}` : "/generate"}
          className="btn-primary"
        >
          <Sparkles className="h-4 w-4" /> New observation
        </Link>
      </div>

      {(childProfiles ?? []).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter learning threads by child profile">
          <Link
            href="/insights"
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
              selectedChild ? "border-clay-200 bg-white text-ink-600" : "border-clay-700 bg-clay-700 text-white"
            }`}
          >
            All children
          </Link>
          {(childProfiles ?? []).map((child) => (
            <Link
              key={child.id}
              href={`/insights?child=${encodeURIComponent(child.id)}`}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                selectedChild?.id === child.id
                  ? "border-clay-700 bg-clay-700 text-white"
                  : "border-clay-200 bg-white text-ink-600"
              }`}
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      {!insights.totalStories ? (
        <div className="card p-12 text-center">
          <Brain className="mx-auto mb-4 h-12 w-12 text-clay-300" />
          <h2 className="font-display text-xl font-bold text-ink-900">Patterns appear after your first stories</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            StoryLoop will use your saved metadata to show learning threads without judging or ranking children.
          </p>
          <Link
            href={selectedChild ? `/generate?child=${encodeURIComponent(selectedChild.id)}` : "/generate"}
            className="btn-primary mt-5"
          >
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

          <section className="mt-5 card p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="section-title mb-1">Curriculum compass</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  {framework === "NZ" ? "Te Whāriki strands over time" : "EYLF outcomes over time"}
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-ink-500">
                  A reflection map of what documentation has surfaced so far. Empty areas are invitations to notice,
                  not deficits or compliance gaps.
                </p>
              </div>
              <Compass className="h-5 w-5 text-clay-500" />
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {compass.map((item) => (
                <div key={item.id} className="rounded-2xl border border-clay-100 bg-cream-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink-800">{item.shortLabel}</span>
                    <span className="font-mono text-[10px] text-clay-700">{item.count}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sage-500 to-clay-500"
                      style={{ width: item.count ? `${Math.max((item.count / maxCompass) * 100, 12)}%` : "0%" }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-ink-500">{item.label}</p>
                </div>
              ))}
            </div>
          </section>

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
