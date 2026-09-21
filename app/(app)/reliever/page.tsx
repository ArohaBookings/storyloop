import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { buildRelieverBrief, type BriefMoment } from "@/lib/reliever-brief";
import PrintButton from "@/components/app/PrintButton";
import RelieverBriefView from "@/components/app/RelieverBriefView";

export const metadata = { title: "Reliever brief" };

// Far enough back to find a last moment for a quiet child, bounded so a long
// running centre never scans its whole history to print one page.
const LOOKBACK_DAYS = 60;

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function RelieverBriefPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/children" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Child profiles
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "relieverBrief")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Centre plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">The room on one page, for a reliever</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A relief teacher walks in knowing nobody, and the day&apos;s documentation either stops or comes out generic.
            This prints one page from what your team already wrote: who to notice today, what each child is into,
            languages spoken at home, and the next steps already planned. Nothing is generated, and it is not a full
            history, because a brief nobody reads before the children arrive is no use.
          </p>
          <Link href="/billing?feature=reliever-brief" className="btn-primary mt-4 inline-flex text-sm">See centre plans</Link>
        </div>
      </div>
    );
  }

  const { data: termRow, error: termError } = await supabase
    .from("profiles").select("term_settings").eq("id", user.id).maybeSingle();
  const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
  const settings = parseTermSettings(
    termError && isMissingTermSettingsColumn(termError) ? null : termRow?.term_settings,
    defaultFramework,
  );
  const today = localDate(new Date(), settings.jurisdiction) ?? new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const [childrenRes, storiesRes, capturesRes] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name, age_group, interests, home_languages, notes, developmental_focus")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("stories")
      .select("child_id, created_at, next_steps, metadata")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("daily_captures")
      .select("child_id, note, observed_at")
      .eq("user_id", user.id)
      .gte("observed_at", since)
      .order("observed_at", { ascending: false })
      .limit(500),
  ]);

  const moments: BriefMoment[] = [
    ...(storiesRes.data ?? []).map((row) => {
      const metadata = readMetadata(row.metadata);
      const savedSteps = Array.isArray(metadata.nextStepProgress)
        ? metadata.nextStepProgress.flatMap((entry) => {
            const item = readMetadata(entry);
            const text = typeof item.text === "string" ? item.text : "";
            const status = item.status === "tried" || item.status === "continue" ? item.status : "planned";
            return text ? [{ text, status }] : [];
          })
        : [];
      const generated = Array.isArray(row.next_steps)
        ? row.next_steps.filter((step): step is string => typeof step === "string").map((text) => ({ text, status: "planned" }))
        : [];
      return {
        childId: (row.child_id as string | null) ?? null,
        date: localDate(row.created_at as string, settings.jurisdiction) ?? String(row.created_at).slice(0, 10),
        title: typeof metadata.storyTitle === "string" ? metadata.storyTitle : null,
        summary: typeof metadata.learningSummary === "string" ? metadata.learningSummary : null,
        dispositions: Array.isArray(metadata.learningDispositions)
          ? metadata.learningDispositions.filter((item): item is string => typeof item === "string")
          : [],
        nextSteps: savedSteps.length ? savedSteps : generated,
      };
    }),
    ...(capturesRes.data ?? []).map((row) => ({
      childId: (row.child_id as string | null) ?? null,
      date: localDate(row.observed_at as string, settings.jurisdiction) ?? String(row.observed_at).slice(0, 10),
      title: null,
      summary: typeof row.note === "string" ? row.note : null,
      dispositions: [],
      nextSteps: [],
    })),
  ];

  const brief = buildRelieverBrief({
    children: (childrenRes.data ?? []).map((child) => ({
      id: child.id as string,
      name: child.name as string,
      ageGroup: (child.age_group as string | null) ?? null,
      interests: (child.interests as string[] | null) ?? null,
      homeLanguages: (child.home_languages as string[] | null) ?? null,
      notes: (child.notes as string | null) ?? null,
      developmentalFocus: (child.developmental_focus as string | null) ?? null,
    })),
    moments,
    today,
  });

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton label="Print for the reliever" />
      </div>
      <RelieverBriefView brief={brief} />
    </div>
  );
}
