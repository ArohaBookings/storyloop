import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { addDays, JURISDICTION_LABEL, latestStartedTerm, localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { buildTermWeather } from "@/lib/term-weather";
import PrintButton from "@/components/app/PrintButton";

export const metadata = { title: "Term report" };

const FALLBACK_WEEKS = 10;

function readDispositions(metadata: unknown): string[] {
  const value = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).learningDispositions : null;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function TermReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Row level security restricts this to the educator's own child.
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) notFound();

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/children" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Child profiles
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "termWeather")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Educator Pro</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">A term report for {child.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            One printable page describing how learning dispositions showed up across the term, built only from the stories
            you saved. No scores, no comparisons with other children, and nothing that your stories did not record.
          </p>
          <Link href="/billing?feature=term-report" className="btn-primary mt-4 inline-flex text-sm">See Educator Pro</Link>
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
  const term = latestStartedTerm(today, settings.jurisdiction);
  // With no calendar for this year, fall back to a plain recent window and say so.
  const period = term
    ? { label: `Term ${term.term} ${term.year}`, start: term.start, end: term.end < today ? term.end : today }
    : { label: `the last ${FALLBACK_WEEKS} weeks`, start: addDays(today, -FALLBACK_WEEKS * 7), end: today };

  const { data: rows } = await supabase
    .from("stories")
    .select("created_at, metadata")
    .eq("user_id", user.id)
    .eq("child_id", child.id)
    .gte("created_at", `${addDays(period.start, -1)}T00:00:00Z`)
    .lte("created_at", `${addDays(period.end, 1)}T23:59:59Z`)
    .order("created_at", { ascending: true })
    .limit(500);

  const report = buildTermWeather({
    childName: child.name,
    termLabel: period.label,
    termStart: period.start,
    termEnd: period.end,
    stories: (rows ?? []).map((row) => ({
      date: localDate(row.created_at as string, settings.jurisdiction) ?? "",
      dispositions: readDispositions(row.metadata),
    })),
  });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton />
      </div>

      <article className="card mt-5 p-6 sm:p-8 print:mt-0 print:border-0 print:p-0 print:shadow-none">
        <p className="section-title mb-1">
          {report.termLabel.charAt(0).toUpperCase() + report.termLabel.slice(1)} · {longDate(report.termStart)} to{" "}
          {longDate(report.termEnd)}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">{child.name}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-700">{report.summary}</p>

        {report.weather.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-lg font-bold text-ink-900">How learning dispositions showed up</h2>
            <ul className="mt-3 space-y-2.5">
              {report.weather.map((item) => (
                <li key={item.disposition} className="break-inside-avoid border-l-2 border-sage-300 pl-3 text-[15px] leading-relaxed text-ink-700">
                  {item.sentence}
                </li>
              ))}
            </ul>
          </section>
        )}

        {report.alsoNoticed.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Also recorded, in the educator&apos;s words</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{report.alsoNoticed.join(" · ")}</p>
          </section>
        )}

        <p className="mt-8 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
          Built from {report.storiesInTerm} saved {report.storiesInTerm === 1 ? "story" : "stories"} about {child.name}
          {term ? ` using ${JURISDICTION_LABEL[settings.jurisdiction]} term dates` : ""}. It describes what was recorded; it
          does not score {child.name}, compare them with other children, or add anything the stories did not say.
        </p>
      </article>
    </div>
  );
}
