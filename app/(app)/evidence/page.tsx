import Link from "next/link";
import { redirectToLogin } from "@/lib/auth/login-redirect";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { addDays, latestStartedTerm, localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { buildEvidencePack, evidenceStoryFromRow, type EvidencePack, type EvidenceStory } from "@/lib/evidence-pack";
import PrintButton from "@/components/app/PrintButton";
import EvidencePackView from "@/components/app/EvidencePackView";
import TeamScopeSwitch from "@/components/app/TeamScopeSwitch";
import TeamChildJoin from "@/components/app/TeamChildJoin";
import { SampleTeamBanner } from "@/components/app/SampleTeam";
import { getTeamContext, loadTeamEvidence, type TeamEvidence } from "@/lib/centre-team-server";
import { pickTeamViewScope, teamViewScopes, type TeamViewScope } from "@/lib/centre-team";
import { sampleEvidence } from "@/lib/sample-team";

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

export default async function EvidencePackPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; scope?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin();

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Dashboard
    </Link>
  );

  // A leader's team (18 Nov 2026): the whole team's pack, her own, or the
  // sample team. For anyone else the page is exactly as it was.
  const team = await getTeamContext(user.id);
  const params = await searchParams;
  const scopes = teamViewScopes({
    ownAccess: hasFeatureAccess(profile.plan, "evidencePack"),
    teamAccess: team.access.kind === "team",
    teamShares: (team.scope?.reviewAuthorIds.length ?? 0) > 0,
    sample: team.sample.show,
  });
  const scope: TeamViewScope | null = pickTeamViewScope(params.scope, scopes);

  if (!scope) {
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

  const localDay = (instant: string | Date) => localDate(instant, settings.jurisdiction);
  let teamEvidence: TeamEvidence | null = null;
  let pack: EvidencePack;
  if (scope === "team") {
    teamEvidence = await loadTeamEvidence(team, `${periodStart}T00:00:00.000Z`, localDay);
    pack = buildEvidencePack({ children: teamEvidence.children, stories: teamEvidence.stories, periodLabel, periodStart, periodEnd });
  } else if (scope === "sample") {
    const sample = sampleEvidence(new Date(), (day) => localDay(day) ?? day.toISOString().slice(0, 10));
    pack = buildEvidencePack({ children: sample.children, stories: sample.stories, periodLabel, periodStart, periodEnd });
  } else {
    // The educator's own pack, read exactly as it always has been.
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
    const stories: EvidenceStory[] = (storiesRes.data ?? []).map((row) => evidenceStoryFromRow(row, localDay));
    pack = buildEvidencePack({
      children: (childrenRes.data ?? []).map((child) => ({ id: child.id as string, name: child.name as string })),
      stories,
      periodLabel,
      periodStart,
      periodEnd,
    });
  }

  const scopeHref = (key: TeamViewScope) => `/evidence?period=${period}&scope=${key}`;
  const sharing = team.scope?.reviewAuthorIds.length ?? 0;
  const privateMembers = team.scope?.privateMemberIds.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        {back}
        <PrintButton label="Print or save as PDF" />
      </div>

      {scopes.length > 1 && (
        <div className="mt-4">
          <TeamScopeSwitch
            scopes={scopes}
            current={scope}
            hrefs={{ team: scopeHref("team"), mine: scopeHref("mine"), sample: scopeHref("sample") }}
            labels={{ team: "Whole team", mine: "My stories", sample: "Sample team" }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
          <Link
            key={key}
            href={scopes.length > 1 ? `/evidence?period=${key}&scope=${scope}` : `/evidence?period=${key}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              key === period ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 text-ink-700 hover:border-clay-300"
            }`}
          >
            {PERIODS[key]}
          </Link>
        ))}
      </div>

      {scope === "sample" && (
        <div className="mt-4">
          <SampleTeamBanner evidenceLink={false} />
        </div>
      )}

      {scope === "team" && teamEvidence && (
        <div className="mt-4 print:mt-0" data-testid="team-evidence-note">
          <p className="text-sm leading-relaxed text-ink-700 print:text-xs">
            The whole team: your stories and those of {sharing} {sharing === 1 ? "educator who shares" : "educators who share"} with
            you. Each child is counted once.
            {privateMembers > 0 && (
              <>
                {" "}
                {privateMembers} {privateMembers === 1 ? "educator keeps their" : "educators keep their"} stories private:{" "}
                {teamEvidence.privateStories} {teamEvidence.privateStories === 1 ? "story" : "stories"} this period, counted here
                as a number only.
              </>
            )}
          </p>
          <TeamChildJoin suggestions={teamEvidence.suggestions} joined={teamEvidence.joined} />
        </div>
      )}

      <EvidencePackView pack={pack} sample={scope === "sample"} />
    </div>
  );
}
