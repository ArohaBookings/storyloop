import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { buildPickupBrief, EARLIER_WINDOW_DAYS, type PickupMoment } from "@/lib/pickup-brief";

export const metadata = { title: "Pickup brief" };

const SOURCE_LABEL: Record<string, string> = {
  capture: "you captured this",
  story: "from a story",
  "child-voice": "their own words",
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { weekday: "long", timeZone: "UTC" });

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function PickupBriefPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/today" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Today Loop
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "pickupBrief")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Paid plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">Something better than &ldquo;he had a good day&rdquo;</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A parent has been away eight hours and gets one sentence that tells them nothing. Not because educators do
            not care, but because twenty children did a hundred things and nobody can hold which was whose. This puts
            the specific true thing next to each name before the door opens. It is not a script: you say it your own
            way. And where there is nothing recorded, it says that instead of dressing it up.
          </p>
          <Link href="/billing?feature=pickup-brief" className="btn-primary mt-4 inline-flex text-sm">See plans</Link>
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
  const since = new Date(Date.now() - (EARLIER_WINDOW_DAYS + 1) * 86_400_000).toISOString();

  const [childrenRes, capturesRes, storiesRes, wordsRes] = await Promise.all([
    supabase.from("child_profiles").select("id, name").eq("user_id", user.id).order("name"),
    supabase.from("daily_captures").select("child_id, note, observed_at").eq("user_id", user.id).gte("observed_at", since).limit(300),
    supabase.from("stories").select("child_id, created_at, metadata").eq("user_id", user.id).gte("created_at", since).limit(300),
    supabase.from("child_voice_notes").select("child_id, words, said_at").eq("user_id", user.id).gte("said_at", since).limit(300),
  ]);

  const dateOf = (value: unknown) => localDate(value as string, settings.jurisdiction) ?? String(value).slice(0, 10);

  const moments: PickupMoment[] = [
    ...(capturesRes.data ?? []).map((row) => ({
      childId: (row.child_id as string | null) ?? null,
      date: dateOf(row.observed_at),
      text: typeof row.note === "string" ? row.note : "",
      source: "capture" as const,
    })),
    ...(storiesRes.data ?? []).map((row) => {
      const metadata = readMetadata(row.metadata);
      return {
        childId: (row.child_id as string | null) ?? null,
        date: dateOf(row.created_at),
        text: typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
        source: "story" as const,
      };
    }),
    ...(wordsRes.data ?? []).map((row) => ({
      childId: (row.child_id as string | null) ?? null,
      date: dateOf(row.said_at),
      text: typeof row.words === "string" ? row.words : "",
      source: "child-voice" as const,
    })),
  ];

  const brief = buildPickupBrief({
    children: (childrenRes.data ?? []).map((child) => ({ id: child.id as string, name: child.name as string })),
    moments,
    today,
  });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
      {back}

      <div className="mt-4">
        <p className="section-title mb-2">Pickup brief</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">Before the door opens.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{brief.headline}</p>
        <p className="mt-1 text-xs text-ink-500">
          Say it however you like. Everything here is something that was actually written down.
        </p>
      </div>

      {brief.lines.length === 0 ? (
        <div className="card mt-6 p-6">
          <p className="text-sm leading-relaxed text-ink-600">
            Add a child on <Link href="/children" className="underline underline-offset-2">Child profiles</Link> and
            this fills itself from what you capture.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {brief.lines.map((line) => (
            <li
              key={line.childId}
              className={`card p-5 ${line.freshness === "nothing" ? "border-clay-300 bg-cream-50" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-ink-900">{line.name}</h2>
                {line.freshness === "today" ? (
                  <span className="text-xs font-semibold uppercase tracking-wider text-sage-700">Today</span>
                ) : line.freshness === "earlier" ? (
                  <span className="text-xs font-semibold uppercase tracking-wider text-clay-700">
                    {line.date ? shortDate(line.date) : "Earlier"}, not today
                  </span>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-clay-700">Nothing written down</span>
                )}
              </div>

              {line.says ? (
                <>
                  <p className="mt-2 text-lg leading-relaxed text-ink-900">{line.says}</p>
                  <p className="mt-1.5 text-xs text-ink-500">
                    {SOURCE_LABEL[line.source ?? "capture"]}
                    {line.freshness === "earlier" && " · say when it was, not today"}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                    There is nothing recorded for {line.name} this week. Worth saying so honestly, and worth noticing
                    something tomorrow.
                  </p>
                  <Link href={`/today?child=${line.childId}`} className="btn-secondary mt-3 inline-flex text-xs">
                    <Plus className="h-3.5 w-3.5" /> Capture something now
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Nothing on this page was generated. Each line is what somebody wrote down, shown to the person who was there.
        If it does not sound like the day you had, trust the day.
      </p>
    </div>
  );
}
