import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { buildCohorts, countByDay, describeTrend, share } from "@/lib/admin-charts";
import { normalizePlanKey } from "@/lib/plans";
import BarChart from "@/components/admin/BarChart";

export const metadata = { title: "Trends · StoryLoop Admin" };
export const dynamic = "force-dynamic";

/**
 * The two questions the other admin pages do not answer.
 *
 * What is the shape of the last sixty days, and does anybody stay? Signups and
 * MRR describe what happened; retention decides whether it keeps happening. A
 * product with month-one retention of 40% cannot be fixed by more traffic, and
 * that is the single fact that separates a growth plan from a wish.
 */

const DAYS = 60;
const COHORT_MONTHS = 12;

export default async function TrendsPage() {
  if (!(await verifyAdmin())) redirect("/admin-login");

  const admin = createAdminSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const cohortSince = new Date(Date.now() - COHORT_MONTHS * 31 * 86_400_000).toISOString();

  const [profilesRes, storiesRes, cohortRes] = await Promise.all([
    admin.from("profiles").select("created_at, is_internal").gte("created_at", since).limit(5000),
    admin.from("stories").select("created_at").gte("created_at", since).limit(20000),
    admin
      .from("profiles")
      .select("created_at, upgraded_at, plan, subscription_status, is_internal")
      .gte("created_at", cohortSince)
      .limit(5000),
  ]);

  const real = (profilesRes.data ?? []).filter((row) => !row.is_internal);
  const signups = countByDay(real.map((row) => row.created_at as string), DAYS, today);
  const stories = countByDay((storiesRes.data ?? []).map((row) => row.created_at as string), DAYS, today);

  const half = Math.floor(DAYS / 2);
  const sum = (list: typeof signups, from: number, to: number) =>
    list.slice(from, to).reduce((total, bucket) => total + bucket.value, 0);

  const cohorts = buildCohorts({
    today,
    months: COHORT_MONTHS,
    people: (cohortRes.data ?? [])
      .filter((row) => !row.is_internal)
      .map((row) => {
        const paying = normalizePlanKey(row.plan) !== "free";
        const active = row.subscription_status === "active" || row.subscription_status === "trialing";
        return {
          signedUpAt: row.created_at as string,
          startedPayingAt: (row.upgraded_at as string | null) ?? null,
          // A person on a paid plan who is no longer active stopped at some
          // point; without a cancellation date the best honest guess is now,
          // which counts them as retained until this month and no further.
          stoppedPayingAt: paying && !active ? today : null,
        };
      }),
  });

  const widest = Math.max(1, ...cohorts.map((row) => row.retained.length));

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-800"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">Trends</h1>
            <p className="text-sm text-ink-400">The last {DAYS} days, and whether anybody stays</p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-ink-700 bg-ink-800/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Signups a day</h2>
            <p className="text-xs text-ink-400">{describeTrend(sum(signups, half, DAYS), sum(signups, 0, half))}</p>
          </div>
          <div className="mt-3"><BarChart buckets={signups} label="Signups per day" accent="#bd9573" /></div>
        </section>

        <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-800/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Stories written a day</h2>
            <p className="text-xs text-ink-400">{describeTrend(sum(stories, half, DAYS), sum(stories, 0, half))}</p>
          </div>
          <div className="mt-3"><BarChart buckets={stories} label="Stories written per day" accent="#799b54" /></div>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Usage, not revenue. It is the number that moves first when something breaks and the number that recovers
            last when something is fixed.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-800/40 p-5">
          <h2 className="font-display text-lg font-bold">Does anybody stay?</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-400">
            By the month somebody signed up, how many were still paying each month after. Blank means that month has
            not happened yet, which is not the same as nobody staying.
          </p>

          {cohorts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No signups in the last {COHORT_MONTHS} months yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-ink-500">
                  <tr className="border-b border-ink-700">
                    <th className="pb-2 pr-3">Signed up</th>
                    <th className="pb-2 pr-3 text-right">People</th>
                    {Array.from({ length: widest }, (_, index) => (
                      <th key={index} className="pb-2 px-2 text-right">M{index}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((row) => (
                    <tr key={row.cohort} className="border-b border-ink-800">
                      <td className="py-2 pr-3 whitespace-nowrap">{row.cohort}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-400">{row.size}</td>
                      {Array.from({ length: widest }, (_, index) => {
                        const value = row.retained[index];
                        if (value === undefined) return <td key={index} className="py-2 px-2" />;
                        const percent = share(value, row.size);
                        return (
                          <td key={index} className="py-2 px-2 text-right tabular-nums">
                            <span
                              className="inline-block rounded px-1.5 py-0.5"
                              style={{
                                // Shaded by strength, so a row reads at a glance
                                // without anybody decoding a legend.
                                background: percent > 0 ? `rgba(121,155,84,${Math.min(0.15 + percent / 130, 0.85)})` : "transparent",
                                color: percent > 45 ? "#0f0e0d" : undefined,
                              }}
                            >
                              {value}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Somebody who paid for part of a month counts as retained that month, which is the honest reading for a
            subscription that can be cancelled mid-month. Where a cancellation date is not recorded, a lapsed paid
            account is counted as retained up to this month and no further, so these numbers lean generous rather than
            flattering by accident.
          </p>
        </section>
      </main>
    </div>
  );
}
