import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Lock } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isJurisdiction, JURISDICTION_LABEL } from "@/lib/terms";
import { parseTermSettings } from "@/lib/term-settings";
import {
  ageBandFrom,
  buildIndex,
  contributionFromRecords,
  MIN_CONTRIBUTING_SERVICES,
  MIN_OBSERVATIONS_PER_CELL,
  MIN_SERVICES_PER_CELL,
  quarterOf,
  type ServiceContribution,
} from "@/lib/learning-index";

export const metadata = { title: "Early Learning Index · StoryLoop Admin" };
export const dynamic = "force-dynamic";

/**
 * What the Index would publish today, and why it will not.
 *
 * Read-only, and it computes the publication rather than storing one, so there
 * is never a stale aggregate sitting in a table waiting to be published by
 * somebody who has forgotten which rules produced it.
 */

const STORY_LIMIT = 5000;

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function LearningIndexAdminPage() {
  if (!(await verifyAdmin())) redirect("/admin-login");

  const admin = createAdminSupabase();
  const quarter = quarterOf(new Date().toISOString().slice(0, 10));

  // Only services that said yes. There is no path here that reads anybody else.
  const { data: consenting } = await admin
    .from("profiles")
    .select("id, term_settings, is_internal")
    .not("learning_index_consent_at", "is", null)
    .limit(5000);

  const services = (consenting ?? []).filter((row) => !row.is_internal);

  const contributions: ServiceContribution[] = [];
  if (services.length) {
    const ids = services.map((s) => s.id as string);
    const [storiesRes, childrenRes] = await Promise.all([
      admin.from("stories").select("user_id, child_id, created_at, outcomes, metadata").in("user_id", ids).limit(STORY_LIMIT),
      admin.from("child_profiles").select("id, age_group").in("user_id", ids).limit(STORY_LIMIT),
    ]);

    const ageOf = new Map((childrenRes.data ?? []).map((c) => [c.id as string, c.age_group as string | null]));

    for (const service of services) {
      const settings = parseTermSettings(service.term_settings, null);
      const region = isJurisdiction(settings.jurisdiction) ? JURISDICTION_LABEL[settings.jurisdiction] : "Unknown";
      const records = (storiesRes.data ?? [])
        .filter((row) => row.user_id === service.id && quarterOf(String(row.created_at).slice(0, 10)) === quarter)
        .flatMap((row) => {
          const band = ageBandFrom(ageOf.get((row.child_id as string) ?? "") ?? null);
          if (!band) return [];
          const metadata = readMetadata(row.metadata);
          return [{
            ageBand: band,
            outcomes: Array.isArray(row.outcomes) ? row.outcomes.filter((o): o is string => typeof o === "string") : [],
            dispositions: Array.isArray(metadata.learningDispositions)
              ? metadata.learningDispositions.filter((d): d is string => typeof d === "string")
              : [],
          }];
        });
      if (records.length) {
        contributions.push(contributionFromRecords({ serviceId: service.id as string, region, quarter, records }));
      }
    }
  }

  const publication = buildIndex({ quarter, contributions });

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-800"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">Early Learning Index</h1>
            <p className="text-sm text-ink-400">{quarter} · computed live, never stored</p>
          </div>
        </div>

        {!publication.publishable ? (
          <section className="mt-6 rounded-2xl border border-ink-700 bg-ink-800/50 p-5">
            <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Not publishable</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-300">
              {publication.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              This is the expected state for a long time, and the threshold is not a setting. Until enough services have
              opted in, &ldquo;aggregated across services&rdquo; would describe a handful of rooms that anybody who
              knows the sector could name.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-ink-700 bg-ink-800/50 p-5">
              <p className="font-semibold">Publishable</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-300">
                {publication.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </section>

            <table className="mt-6 w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-ink-500">
                <tr className="border-b border-ink-700">
                  <th className="pb-2">Theme</th>
                  <th className="pb-2">Age band</th>
                  <th className="pb-2">Region</th>
                  <th className="pb-2 text-right">Services</th>
                  <th className="pb-2 text-right">Observations</th>
                  <th className="pb-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {publication.cells.map((cell) => (
                  <tr key={`${cell.theme}-${cell.ageBand}-${cell.region}`} className="border-b border-ink-800">
                    <td className="py-2">{cell.theme}</td>
                    <td className="py-2 text-ink-400">{cell.ageBand}</td>
                    <td className="py-2 text-ink-400">{cell.region}</td>
                    <td className="py-2 text-right tabular-nums">{cell.services}</td>
                    <td className="py-2 text-right tabular-nums">{cell.observations}</td>
                    <td className="py-2 text-right tabular-nums">{Math.round(cell.share * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <section className="mt-8 rounded-2xl border border-ink-800 p-5 text-sm leading-relaxed text-ink-400">
          <p className="font-semibold text-ink-200">The rules, so they are never a surprise</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Nothing at all until {MIN_CONTRIBUTING_SERVICES} services have opted in for the quarter.</li>
            <li>No cell shown unless at least {MIN_SERVICES_PER_CELL} separate services and {MIN_OBSERVATIONS_PER_CELL} observations stand behind it.</li>
            <li>No region named unless enough services sit in it.</li>
            <li>Counts only: no child, educator, service, story, free text, or date finer than a quarter.</li>
            <li>Opt-in, off by default, and withdrawable at any time.</li>
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            {services.length} {services.length === 1 ? "service has" : "services have"} opted in so far.
          </p>
        </section>
      </main>
    </div>
  );
}
