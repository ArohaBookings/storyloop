import Link from "next/link";
import { ArrowRight, BarChart3, Clock, LockKeyhole, MessageCircleHeart, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { buildPlanningBoard } from "@/lib/planning-board";
import { hasFeatureAccess } from "@/lib/plans";

export const metadata = { title: "ROI dashboard" };

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formatHours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hrs`;
}

export default async function RoiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getOrCreateProfile(user!);
  const canUseRoi = hasFeatureAccess(profile.plan, "directorRoiDashboard");

  const [{ data: stories }, { data: children }] = await Promise.all([
    supabase
      .from("stories")
      .select("id, child_id, child_name, story_text, outcomes, next_steps, metadata, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("child_profiles")
      .select("id, name, age_group, interests")
      .eq("user_id", user!.id)
      .limit(500),
  ]);

  const storyRows = stories ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthStories = storyRows.filter((story) => story.created_at?.startsWith(thisMonth));
  const backlogStories = storyRows.filter((story) => asRecord(story.metadata).inputMethod === "backlog");
  const reviewedStories = storyRows.filter((story) => Boolean(asRecord(story.metadata).reviewedAt));
  const familyQuestions = storyRows.filter((story) => typeof asRecord(story.metadata).familyQuestion === "string" && asRecord(story.metadata).familyQuestion);
  const familyReplies = storyRows.filter((story) => typeof asRecord(story.metadata).whanauVoice === "string" && asRecord(story.metadata).whanauVoice);
  const translationPacks = storyRows.filter((story) => Boolean(asRecord(story.metadata).familyTranslationPack));
  const estimatedMinutesSaved = storyRows.length * 18 + backlogStories.length * 12 + translationPacks.length * 6;
  const planningBoard = buildPlanningBoard(storyRows.slice(0, 80), children ?? []);

  const metrics = [
    { label: "Stories created", value: storyRows.length, sub: `${monthStories.length} this month`, icon: Sparkles, colour: "text-clay-700" },
    { label: "Estimated time saved", value: formatHours(estimatedMinutesSaved), sub: "18 min/story plus workflow tools", icon: Clock, colour: "text-sage-700" },
    { label: "Backlog cleared", value: backlogStories.length, sub: "Stories started through Backlog Rescue", icon: TrendingUp, colour: "text-amber-700" },
    { label: "Family loops", value: `${familyReplies.length}/${familyQuestions.length}`, sub: "Replies captured from generated questions", icon: MessageCircleHeart, colour: "text-clay-700" },
  ];

  if (!canUseRoi) {
    return (
      <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
        <div className="rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm">
          <p className="section-title mb-3">Director ROI dashboard</p>
          <h1 className="font-display text-4xl font-bold text-ink-900">Prove the value of documentation support.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-600 md:text-base">
            Centre Growth shows stories created, time saved, backlog cleared, review completion, family loop use, and planning signals.
          </p>
        </div>
        <div className="mt-6 rounded-3xl border border-clay-200 bg-cream-50 p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-700 text-paper">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">ROI dashboard is on Centre Growth.</h2>
                <p className="mt-1 text-sm text-ink-600">Use Centre Starter for planning. Upgrade when directors need rollout and value reporting.</p>
              </div>
            </div>
            <Link href="/billing?feature=director-roi-dashboard" className="btn-primary flex-shrink-0">
              View Centre Growth <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm">
        <p className="section-title mb-3">Director ROI dashboard</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">Documentation value without surveillance.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-600 md:text-base">
          These signals show workload relief, review health, and family partnership activity. They are designed for support and coaching, not ranking educators.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, sub, icon: Icon, colour }) => (
          <div key={label} className="card p-5">
            <Icon className={`mb-4 h-5 w-5 ${colour}`} />
            <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-clay-700">{label}</p>
            <p className="mt-1 text-xs text-ink-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-clay-700" />
            <h2 className="font-display text-2xl font-bold text-ink-900">Rollout health</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: "Educator review completion", value: percent(reviewedStories.length, storyRows.length), detail: `${reviewedStories.length} of ${storyRows.length} stories marked reviewed` },
              { label: "Family question usage", value: percent(familyQuestions.length, storyRows.length), detail: `${familyQuestions.length} stories include a family question` },
              { label: "Family reply capture", value: percent(familyReplies.length, Math.max(familyQuestions.length, 1)), detail: `${familyReplies.length} replies captured` },
              { label: "Translation/readability usage", value: percent(translationPacks.length, storyRows.length), detail: `${translationPacks.length} translation packs created` },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-800">{row.label}</span>
                  <span className="font-bold text-clay-700">{row.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-clay-100">
                  <div className="h-full rounded-full bg-clay-600" style={{ width: `${Math.max(row.value, row.value ? 8 : 0)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink-500">{row.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-2xl font-bold text-ink-900">Director attention list</h2>
          <p className="mt-1 text-xs text-ink-600">Supportive prompts from Documentation Radar and learning loops.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Needs fresh observation</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900">
                {planningBoard.documentationRadar.filter((item) => item.signal !== "Current").length}
              </p>
            </div>
            <div className="rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Open response ideas</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900">{planningBoard.openResponses.length}</p>
            </div>
            <div className="rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Family reply gaps</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900">{planningBoard.familyReplyGaps.length}</p>
            </div>
            <div className="rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Unreviewed stories</p>
              <p className="mt-2 font-display text-2xl font-bold text-ink-900">{planningBoard.unreviewedStories.length}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
