import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { REPORT_ACTION, SEARCH_GROWTH_TARGET, type WeeklyReport } from "@/lib/business-manager";

export const metadata = { title: "Business manager · StoryLoop Admin" };
export const dynamic = "force-dynamic";

const pct = (value: number | null | undefined) => (value === null || value === undefined ? "–" : `${value >= 0 ? "+" : ""}${Math.round(value * 1000) / 10}%`);
const money = (value: number | null | undefined) => (value === null || value === undefined ? "–" : `NZ$${value.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`);

/**
 * The weekly business report (lib/business-manager.ts): how search, AI
 * assistants, Facebook, signups and revenue moved, and what to do this week.
 * Written each Monday morning (NZ) from StoryLoop's own numbers; read-only.
 */
export default async function BusinessManagerPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");
  const { data } = await createAdminSupabase()
    .from("admin_audit_log")
    .select("details, created_at")
    .eq("action", REPORT_ACTION)
    .order("created_at", { ascending: false })
    .limit(12);
  const reports = (data ?? []).map((row) => row.details as WeeklyReport).filter((r) => r?.metrics && r?.rundown);
  const latest = reports[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-clay-700" />
        <h1 className="font-display text-3xl font-bold text-ink-900">Business manager</h1>
      </div>
      <p className="text-sm text-ink-600">
        Every Monday morning: search (Google, Bing and others), AI assistants, Facebook, signups and Stripe revenue, against the {Math.round(SEARCH_GROWTH_TARGET * 100)}% a week growth target for search (SEO) and for AI answers (AEO/GEO), and the NZ$10k MRR goal. Counted in code; one model call a week writes the summary. It also sets the blog to two guides a week while either is behind target.
      </p>

      {!latest && <div className="card p-5 text-sm text-ink-600">No report yet. The first one is written on Monday morning.</div>}

      {latest && (
        <section className="card space-y-3 p-5" data-testid="latest-report">
          <p className="section-title">Week to {latest.weekEnding}</p>
          <h2 className="font-display text-2xl font-bold text-ink-900">{latest.rundown.headline}</h2>
          <p className="text-sm text-ink-700">{latest.rundown.summary}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-800">
            {latest.rundown.actions.map((action) => <li key={action}>{action}</li>)}
          </ol>
          <p className="text-xs text-ink-500">{latest.ai.used ? `Summary by ${latest.ai.model}.` : "Summary written by code (no model call)."} {latest.emailed ? "Emailed to you." : "Not emailed."}</p>
        </section>
      )}

      {reports.length > 0 && (
        <section className="card overflow-x-auto p-5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="py-2">Week to</th>
                <th>Search</th>
                <th>4-week trend</th>
                <th>Google / Bing</th>
                <th>AI</th>
                <th>Facebook</th>
                <th>Signups</th>
                <th>MRR</th>
                <th>Guides</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.weekEnding} className="border-t border-clay-100">
                  <td className="py-2 font-semibold text-ink-900">{r.weekEnding}</td>
                  <td>{r.metrics.search.thisWeek} ({pct(r.metrics.search.weeklyGrowth)})</td>
                  <td className={r.metrics.search.onTarget === false ? "text-red-700" : r.metrics.search.onTarget ? "text-sage-700" : ""}>{pct(r.metrics.search.trendWeeklyGrowth)}</td>
                  <td>{r.metrics.visits.thisWeek.google} / {r.metrics.visits.thisWeek.bing}</td>
                  <td className={r.metrics.ai?.onTarget === true ? "text-sage-700" : ""}>{r.metrics.visits.thisWeek.ai} ({pct(r.metrics.ai?.weeklyGrowth)})</td>
                  <td>{r.metrics.visits.thisWeek.facebook}</td>
                  <td>{r.metrics.signups.thisWeek}</td>
                  <td>{money(r.metrics.revenue.mrrNzd)}</td>
                  <td>{r.metrics.blog.publishedThisWeek} (next {r.metrics.blog.targetNextWeek})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
