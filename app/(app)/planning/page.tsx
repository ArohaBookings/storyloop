"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Lightbulb, Loader2, LockKeyhole, RefreshCw, Sparkles, Users } from "lucide-react";

type PlanningBrief = {
  summary: string;
  emergingInterests: string[];
  curriculumOpportunities: string[];
  environmentSetups: string[];
  intentionalTeachingMoves: string[];
  familyPartnershipPrompt: string;
  teamReflectionQuestions: string[];
  watchNext: string[];
};

type PlanningBoard = {
  openResponses: Array<{ childName: string; text: string; status: string; storyId: string }>;
  documentationRadar: Array<{
    childName: string;
    ageGroup: string;
    lastStoryAt: string | null;
    gapDays: number | null;
    signal: string;
    interests: string[];
  }>;
  familyReplyGaps: Array<{ storyId: string; childName: string; question: string; createdAt: string | null }>;
  unreviewedStories: Array<{ storyId: string; childName: string; createdAt: string | null }>;
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-clay-100 bg-white p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-clay-600">{title}</p>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function SmallSignalList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; label: string; detail?: string; href?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-clay-100 bg-white p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-clay-600">{title}</p>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl bg-cream-50 p-3">
              {item.href ? (
                <Link href={item.href} className="text-sm font-semibold text-ink-900 hover:text-clay-700">{item.label}</Link>
              ) : (
                <p className="text-sm font-semibold text-ink-900">{item.label}</p>
              )}
              {item.detail && <p className="mt-1 text-xs leading-relaxed text-ink-600">{item.detail}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-500">{empty}</p>
      )}
    </div>
  );
}

export default function PlanningPage() {
  const [brief, setBrief] = useState<PlanningBrief | null>(null);
  const [planningBoard, setPlanningBoard] = useState<PlanningBoard | null>(null);
  const [storyCount, setStoryCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const generateBrief = async () => {
    setLoading(true);
    setLocked(false);
    setError("");

    try {
      const response = await fetch("/api/team-planning", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        if (data.upgradeRequired) setLocked(true);
        throw new Error(data.error ?? "Could not create planning brief.");
      }
      setBrief(data.brief);
      setPlanningBoard(data.planningBoard ?? null);
      setStoryCount(data.storyCount ?? 0);
    } catch (planningError) {
      setError(planningError instanceof Error ? planningError.message : "Could not create planning brief.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm animate-fade-up">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-clay-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-sage-200/30 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-title mb-3">Centre planning</p>
            <h1 className="font-display text-4xl font-bold text-ink-900">Turn recent stories into next-week planning.</h1>
            <p className="mt-3 text-sm text-ink-600 md:text-base">
              Room Planning Briefs look across your recent stories and suggest emerging interests, environment setups, intentional teaching moves, family partnership prompts, and team reflection questions.
            </p>
          </div>
          <button onClick={generateBrief} disabled={loading} className="btn-primary flex-shrink-0 py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : brief ? <RefreshCw className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
            {brief ? "Regenerate brief" : "Create planning brief"}
          </button>
        </div>
      </div>

      {error && (
        <div className={`mt-6 rounded-3xl border p-5 shadow-soft ${locked ? "border-clay-200 bg-cream-50" : "border-red-100 bg-red-50"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${locked ? "bg-clay-700 text-paper" : "bg-red-100 text-red-700"}`}>
                {locked ? <LockKeyhole className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">{locked ? "Centre feature" : "Planning brief not ready"}</h2>
                <p className="mt-1 text-sm text-ink-700">{error}</p>
              </div>
            </div>
            {locked && (
              <Link href="/billing?offer=activation" className="btn-primary flex-shrink-0">
                View Centre plan <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {!brief && !error && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "No extra paperwork", text: "The brief uses stories already written instead of asking the team to fill another form." },
            { icon: Users, title: "Built for meetings", text: "Use it as a weekly team conversation starter, then adapt with local educator judgement." },
            { icon: Lightbulb, title: "Planning from evidence", text: "Suggestions stay close to observed interests, next steps, curriculum links, and family partnership." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <Icon className="mb-4 h-6 w-6 text-clay-700" />
              <h2 className="font-display text-xl font-bold text-ink-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{text}</p>
            </div>
          ))}
        </div>
      )}

      {brief && (
        <div className="mt-6 space-y-5">
          <div className="rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5 shadow-soft">
            <p className="section-title mb-2">Generated from {storyCount} recent stories</p>
            <h2 className="font-display text-2xl font-bold text-ink-900">{brief.summary || "Planning evidence summary"}</h2>
          </div>

          {planningBoard && (
            <div className="grid gap-4 xl:grid-cols-4">
              <SmallSignalList
                title="Documentation Radar"
                empty="All saved child profiles have recent story coverage."
                items={planningBoard.documentationRadar.slice(0, 6).map((item) => ({
                  key: item.childName,
                  label: item.childName,
                  detail: `${item.signal}${item.gapDays === null ? "" : ` · ${item.gapDays} days since last story`}${item.ageGroup ? ` · ${item.ageGroup}` : ""}`,
                }))}
              />
              <SmallSignalList
                title="Open response ideas"
                empty="No open response ideas found."
                items={planningBoard.openResponses.slice(0, 6).map((item, index) => ({
                  key: `${item.storyId}-${index}`,
                  label: item.childName,
                  detail: `${item.status}: ${item.text}`,
                  href: item.storyId ? `/history#${item.storyId}` : undefined,
                }))}
              />
              <SmallSignalList
                title="Family reply gaps"
                empty="No open family questions waiting for a reply."
                items={planningBoard.familyReplyGaps.slice(0, 6).map((item) => ({
                  key: item.storyId,
                  label: item.childName,
                  detail: item.question,
                  href: item.storyId ? `/history#${item.storyId}` : undefined,
                }))}
              />
              <SmallSignalList
                title="Human review queue"
                empty="No unreviewed recent stories found."
                items={planningBoard.unreviewedStories.slice(0, 6).map((item) => ({
                  key: item.storyId,
                  label: item.childName,
                  detail: item.createdAt ? `Created ${new Date(item.createdAt).toLocaleDateString("en-AU")}` : "Created recently",
                  href: item.storyId ? `/history#${item.storyId}` : undefined,
                }))}
              />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ListBlock title="Emerging interests" items={brief.emergingInterests} />
            <ListBlock title="Curriculum opportunities" items={brief.curriculumOpportunities} />
            <ListBlock title="Environment setups" items={brief.environmentSetups} />
            <ListBlock title="Intentional teaching moves" items={brief.intentionalTeachingMoves} />
            <ListBlock title="Team reflection questions" items={brief.teamReflectionQuestions} />
            <ListBlock title="Watch next" items={brief.watchNext} />
          </div>

          {brief.familyPartnershipPrompt && (
            <div className="card-warm p-5 md:p-6">
              <p className="section-title mb-2">Family partnership prompt</p>
              <p className="text-sm leading-relaxed text-ink-700">{brief.familyPartnershipPrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
