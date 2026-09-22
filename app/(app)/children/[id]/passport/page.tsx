import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, Quote, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { packStoryFromRow } from "@/lib/transition-pack";
import { buildLearningRecord, type PassportOwnWords } from "@/lib/learning-passport";

export const metadata = { title: "Learning passport" };

const STORY_LIMIT = 300;

const longDate = (iso: string) =>
  new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso)
    .toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function LearningPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, age_group, interests, home_languages, notes, developmental_focus, whanau_aspirations")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) notFound();

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/children" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Child profiles
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "learningPassport")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Paid plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">What they take with them</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A child builds three years of documentation and then, on one day in January, it stops. The school gets a
            one-page statement and everything else evaporates. This is one file the family keeps: who their child is as
            a learner, in their own words and their educators&apos;. It opens on any computer, offline, with no account,
            and keeps working whatever happens to StoryLoop.
          </p>
          <Link href="/billing?feature=learning-passport" className="btn-primary mt-4 inline-flex text-sm">See plans</Link>
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

  const [storiesRes, wordsRes] = await Promise.all([
    supabase.from("stories").select("id, created_at, next_steps, metadata")
      .eq("user_id", user.id).eq("child_id", id).order("created_at", { ascending: false }).limit(STORY_LIMIT),
    supabase.from("child_voice_notes").select("words, provenance, said_at")
      .eq("user_id", user.id).eq("child_id", id).order("said_at", { ascending: false }).limit(50),
  ]);

  const stories = (storiesRes.data ?? []).map((row) =>
    packStoryFromRow({
      id: row.id as string,
      date: localDate(row.created_at as string, settings.jurisdiction) ?? String(row.created_at).slice(0, 10),
      next_steps: row.next_steps,
      metadata: row.metadata,
    }),
  );
  const ownWords: PassportOwnWords[] = (wordsRes.data ?? []).map((row) => ({
    words: row.words as string,
    saidAt: row.said_at as string,
    provenance: row.provenance as PassportOwnWords["provenance"],
  }));

  const record = buildLearningRecord({
    child: {
      name: child.name as string,
      ageGroup: (child.age_group as string | null) ?? null,
      interests: (child.interests as string[] | null) ?? null,
      homeLanguages: (child.home_languages as string[] | null) ?? null,
      notes: (child.notes as string | null) ?? null,
      developmentalFocus: (child.developmental_focus as string | null) ?? null,
      whanauAspirations: (child.whanau_aspirations as string | null) ?? null,
    },
    stories,
    ownWords,
    generatedAt: new Date().toISOString(),
  });

  const inside = [
    { icon: Quote, label: "In their own words", count: record.ownWords.length, unit: "thing they said" },
    { icon: Sparkles, label: "How they go about learning", count: record.howTheyLearn.length, unit: "way that came up more than once" },
    { icon: Users, label: "In their family's words", count: record.familyVoice.length, unit: "family comment" },
    { icon: FileText, label: "Some of what happened", count: record.moments.length, unit: "moment" },
  ];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
      {back}

      <div className="mt-4">
        <p className="section-title mb-2">Learning passport</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">
          What {record.child.name} takes with them.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          One file for {record.child.name}&apos;s family to keep. It opens on any computer, works offline, needs no
          account, and keeps working whatever happens to StoryLoop or to this service. Give it to the family, and they
          decide who ever sees it.
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-xl font-bold text-ink-900">What is in it</h2>
        <p className="mt-1 text-sm text-ink-500">
          {record.period.storyCount
            ? `Drawn from ${record.period.storyCount} ${record.period.storyCount === 1 ? "story" : "stories"}, ${longDate(record.period.from!)} to ${longDate(record.period.to!)}.`
            : "No saved stories for this child yet."}
        </p>

        <ul className="mt-4 divide-y divide-clay-100">
          {inside.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex items-center gap-2.5 text-sm text-ink-800">
                <row.icon className={`h-4 w-4 ${row.count ? "text-sage-600" : "text-ink-300"}`} />
                {row.label}
              </span>
              <span className="text-sm tabular-nums text-ink-600">
                {row.count ? `${row.count} ${row.unit}${row.count === 1 ? "" : "s"}` : "nothing yet"}
              </span>
            </li>
          ))}
        </ul>

        <a
          href={`/api/passport/${id}`}
          download
          className="btn-primary mt-5 inline-flex text-sm"
        >
          <Download className="h-4 w-4" /> Download the file
        </a>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Nothing is sent anywhere. The file downloads to this device and it is up to you to pass it on, with the
          family&apos;s agreement. StoryLoop keeps no copy of it.
        </p>
      </div>

      <div className="card mt-4 p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">What it says about itself</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Every line is copied from something already recorded. Nothing is generated and nothing is inferred about the
          child. The file states plainly that it is not an assessment, not a score, not a diagnosis and not a
          comparison with any other child, and that anything important which was never written down is not in it.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          It also carries the same information in a machine-readable form, so a school system could one day read it
          directly rather than somebody retyping it.
        </p>
        <p className="mt-3 text-xs text-ink-500">
          Looking for the printed handover instead?{" "}
          <Link href={`/children/${id}/transition`} className="underline underline-offset-2">The transition pack</Link>{" "}
          is the one an educator prints and walks across.
        </p>
      </div>
    </div>
  );
}
