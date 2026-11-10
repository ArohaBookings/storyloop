import Link from "next/link";
import { ArrowRight, BookHeart, FileText, PenLine } from "lucide-react";
import { redirectToLogin } from "@/lib/auth/login-redirect";
import PrintButton from "@/components/app/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { buildYearBoard, teachingYear, yearStart, YEAR_THIN_STORIES, type YearChild, type YearStory } from "@/lib/year-board";

export const metadata = { title: "The year in one tap" };

function day(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" });
}

/**
 * The year in one tap (lib/year-board.ts). Read-only: it counts what the
 * educator already saved and links to the tools that already exist for each
 * child. Printing the page gives the handover sheet for next year's teacher.
 */
export default async function YearPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin();

  const since = yearStart(teachingYear()).toISOString();
  const [{ data: childRows }, { data: storyRows }] = await Promise.all([
    supabase.from("child_profiles").select("id, name, age_group, interests, home_languages").eq("user_id", user.id).order("name"),
    supabase.from("stories").select("child_id, child_name, created_at, outcomes, next_steps").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: true }).limit(5000),
  ]);
  const board = buildYearBoard((childRows ?? []) as YearChild[], (storyRows ?? []) as YearStory[]);

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8" data-testid="year-board">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-clay-700">{board.year}</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">The year in one tap</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600 print:hidden">
            Every child on one page, from the stories you saved this year. Draft each child&apos;s summary or transition statement, give the
            family their keepsake, and print this page as the handover sheet for next year.
          </p>
        </div>
        <div className="print:hidden"><PrintButton label="Print the handover sheet" /></div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 print:hidden">
        <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-ink-500">Stories this year</p><p className="mt-1 font-display text-3xl font-bold text-ink-900">{board.stories}</p></div>
        <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-ink-500">Ready for a summary</p><p className="mt-1 font-display text-3xl font-bold text-sage-800">{board.ready} <span className="text-base font-semibold text-ink-500">of {board.children}</span></p></div>
        <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-ink-500">Fewer than {YEAR_THIN_STORIES} stories</p><p className="mt-1 font-display text-3xl font-bold text-clay-700">{board.thin}</p></div>
      </div>

      {board.rows.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="font-display text-lg font-bold text-ink-900">Nothing saved for {board.year} yet</p>
          <p className="mt-1 text-sm text-ink-500">Write a story and it appears here, under the child it is about.</p>
          <Link href="/generate" className="btn-primary mt-5 inline-flex">Write a story</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {board.rows.map((row) => (
            <article key={row.id ?? `name-${row.name}`} className="card break-inside-avoid p-4 sm:p-5" data-testid="year-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-ink-900">
                    {row.name}
                    {row.ageGroup && <span className="ml-2 text-sm font-semibold text-ink-500">{row.ageGroup}</span>}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {row.stories === 0
                      ? `No stories saved in ${board.year}.`
                      : `${row.stories} ${row.stories === 1 ? "story" : "stories"}, ${row.stories === 1 ? day(row.lastStory) : `${day(row.firstStory)} to ${day(row.lastStory)}`}.`}
                    {!row.id && " Not in your child list, so there is no profile to draft from."}
                  </p>
                </div>
                <span className={`flex-none rounded-full px-3 py-1 text-xs font-bold ${row.thin ? "bg-clay-100 text-clay-800" : "bg-sage-100 text-sage-800"}`}>
                  {row.thin ? `Needs ${YEAR_THIN_STORIES - row.stories} more` : "Ready"}
                </span>
              </div>

              {(row.topLinks.length > 0 || row.workingOn || row.interests.length > 0 || row.homeLanguages.length > 0) && (
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {row.topLinks.length > 0 && (<div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Their stories were mostly about</dt><dd className="mt-0.5 text-ink-800">{row.topLinks.join(" · ")}</dd></div>)}
                  {row.workingOn && (<div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Last &ldquo;where to next&rdquo;</dt><dd className="mt-0.5 text-ink-800">{row.workingOn}</dd></div>)}
                  {row.interests.length > 0 && (<div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Interests</dt><dd className="mt-0.5 text-ink-800">{row.interests.join(", ")}</dd></div>)}
                  {row.homeLanguages.length > 0 && (<div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Languages at home</dt><dd className="mt-0.5 text-ink-800">{row.homeLanguages.join(", ")}</dd></div>)}
                </dl>
              )}

              <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                {row.id && !row.thin && (
                  <Link href={`/children/${row.id}/transition`} className="btn-primary px-4 py-2 text-xs" data-track="year_summary">
                    <FileText className="h-3.5 w-3.5" /> Draft their summary or statement
                  </Link>
                )}
                {row.id && row.stories > 0 && (
                  <Link href={`/children/${row.id}/passport`} className="btn-secondary px-4 py-2 text-xs" data-track="year_keepsake">
                    <BookHeart className="h-3.5 w-3.5" /> Family keepsake
                  </Link>
                )}
                {row.thin && (
                  <Link href={row.id ? `/generate?child=${row.id}` : "/generate"} className="btn-secondary px-4 py-2 text-xs" data-track="year_write">
                    <PenLine className="h-3.5 w-3.5" /> Write a story about {row.name}
                  </Link>
                )}
                {!row.id && (
                  <Link href="/children" className="btn-ghost px-3 py-2 text-xs">Add {row.name} to your child list <ArrowRight className="h-3 w-3" /></Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-500">
        Counted from stories saved since 1 January {board.year}. A summary is drafted from a child&apos;s own stories, which is why it waits for {YEAR_THIN_STORIES}.
        Nothing on this page is written by AI.
      </p>
    </div>
  );
}
