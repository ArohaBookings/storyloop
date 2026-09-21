import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { addDays, latestStartedTerm, localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { buildEvidencePack, type EvidenceStory } from "@/lib/evidence-pack";
import PrintButton from "@/components/app/PrintButton";
import EvidencePackView from "@/components/app/EvidencePackView";

export const metadata = { title: "Evidence pack" };

// A review visit looks at the current term, or thereabouts. A year is the
// widest window worth offering: beyond that the pack stops being about the
// documentation a team is doing now.
const PERIODS = {
  term: "This term",
  "90": "Last 90 days",
  year: "Last 12 months",
} as const;
type PeriodKey = keyof typeof PERIODS;

const isPeriod = (value: unknown): value is PeriodKey =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PERIODS, value);

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export default async function EvidencePackPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Dashboard
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "evidencePack")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Centre plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">The evidence, assembled from stories you already wrote</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A review visit asks how every child is covered, where the planning cycle closes, where critical reflection is
            written down and where families appear. Most services have all of it and spend a fortnight before the visit
            proving it. This counts it from your saved stories in one click, and names the gaps first so you find them
            before an assessor does. Nothing is generated, no child is scored, and it is a summary of your own records
            rather than a compliance judgement.
          </p>
          <Link href="/billing?feature=evidence-pack" className="btn-primary mt-4 inline-flex text-sm">See centre plans</Link>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const period: PeriodKey = isPeriod(params.period) ? params.period : "term";

  const { data: termRow, error: termError } = await supabase
    .from("profiles").select("term_settings").eq("id", user.id).maybeSingle();
  const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
  const settings = parseTermSettings(
    termError && isMissingTermSettingsColumn(termError) ? null : termRow?.term_settings,
    defaultFramework,
  );
  const today = localDate(new Date(), settings.jurisdiction) ?? new Date().toISOString().slice(0, 10);

  // "This term" only means something where the calendar knows the term. It
  // falls back to 90 days rather than inventing a boundary.
  const term = period === "term" ? latestStartedTerm(today, settings.jurisdiction) : null;
  const { periodStart, periodEnd, periodLabel } =
    term
      ? { periodStart: term.start, periodEnd: today < term.end ? today : term.end, periodLabel: `Term ${term.term} ${term.year}` }
      : period === "year"
        ? { periodStart: addDays(today, -365), periodEnd: today, periodLabel: "Last 12 months" }
        : { periodStart: addDays(today, -90), periodEnd: today, periodLabel: "Last 90 days" };

  const [childrenRes, storiesRes] = await Promise.all([
    supabase.from("child_profiles").select("id, name").eq("user_id", user.id).order("name"),
    supabase
      .from("stories")
      .select("id, child_id, created_at, outcomes, next_steps, metadata")
      .eq("user_id", user.id)
      .gte("created_at", `${periodStart}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const stories: EvidenceStory[] = (storiesRes.data ?? []).map((row) => {
    const metadata = readMetadata(row.metadata);
    const savedSteps = Array.isArray(metadata.nextStepProgress)
      ? metadata.nextStepProgress.flatMap((entry) => {
          const item = readMetadata(entry);
          const stepText = text(item.text);
          const status = item.status === "tried" || item.status === "continue" ? item.status : "planned";
          return stepText ? [{ text: stepText, status }] : [];
        })
      : [];
    const generated = Array.isArray(row.next_steps)
      ? row.next_steps.filter((step): step is string => typeof step === "string").map((step) => ({ text: step, status: "planned" }))
      : [];
    return {
      id: row.id as string,
      childId: (row.child_id as string | null) ?? null,
      date: localDate(row.created_at as string, settings.jurisdiction) ?? String(row.created_at).slice(0, 10),
      title: text(metadata.storyTitle),
      summary: text(metadata.learningSummary),
      outcomes: Array.isArray(row.outcomes) ? row.outcomes.filter((item): item is string => typeof item === "string") : [],
      dispositions: Array.isArray(metadata.learningDispositions)
        ? metadata.learningDispositions.filter((item): item is string => typeof item === "string")
        : [],
      nextSteps: savedSteps.length ? savedSteps : generated,
      reflection: text(metadata.educatorReflection),
      familyVoice: text(metadata.whanauVoice),
    };
  });

  const pack = buildEvidencePack({
    children: (childrenRes.data ?? []).map((child) => ({ id: child.id as string, name: child.name as string })),
    stories,
    periodLabel,
    periodStart,
    periodEnd,
  });

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton label="Print or save as PDF" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
          <Link
            key={key}
            href={`/evidence?period=${key}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              key === period ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 text-ink-700 hover:border-clay-300"
            }`}
          >
            {PERIODS[key]}
          </Link>
        ))}
      </div>

      <EvidencePackView pack={pack} />
    </div>
  );
}
