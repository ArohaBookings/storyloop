import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, MousePointerClick, TrendingUp, Users, Gift, DollarSign, AlertTriangle } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";

export const metadata = { title: "Growth · StoryLoop Admin" };
export const dynamic = "force-dynamic";

/**
 * Every aggregate on this page is computed in Postgres via a single RPC, not by
 * pulling rows into JS. That keeps the page flat as the account base grows:
 * counting 100k profiles in JavaScript would time out, while an indexed
 * aggregate does not care. Only the recent-signup table fetches actual rows,
 * and it is hard-limited.
 */

const MONTHLY_PRICE: Record<PlanKey, number> = {
  free: 0, educator: 19, educator_pro: 29, centre_starter: 99, centre_growth: 199,
};

type Metrics = {
  users: { total: number; internal: number; activated: number; one_and_done: number; repeat: number; power: number; new_7d: number; new_30d: number };
  revenue: { paying: number; active: number; trialing: number; at_risk: number; churned: number; by_plan: Record<string, number> };
  plan_mix: Record<string, number>;
  stories: { total: number; last_7d: number; last_30d: number; per_day: { day: string; count: number }[] };
  signups_per_day: { day: string; count: number }[];
  acquisition: { source: string; signups: number; activated: number; paid: number }[];
  traffic: {
    visitors_30d: number; pageviews_30d: number; demo_started_30d: number; demo_completed_30d: number; signup_views_30d: number;
    by_source: { source: string; visitors: number }[];
    by_device: { device: string; visitors: number }[];
    by_country: { country: string; visitors: number }[];
    by_page: { path: string; views: number; visitors: number }[];
    landing_pages: { path: string; sessions: number; reached_signup: number }[];
  };
  referrals: { total: number; pending: number; credited: number; credit_cents: number };
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string | number; sub?: string; tone?: "default" | "good" | "warn" }) {
  const ring = tone === "good" ? "border-sage-500/30" : tone === "warn" ? "border-amber-500/40" : "border-ink-800";
  return (
    <div className={`rounded-2xl border ${ring} bg-ink-900/60 p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

function Bars({ rows, max }: { rows: { day: string; count: number }[]; max: number }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.day} className="flex items-center gap-2 text-xs">
          <span className="w-12 shrink-0 text-ink-400">{r.day.slice(5)}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-clay-500" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right font-bold tabular-nums text-white">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default async function GrowthPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const started = Date.now();
  const [{ data: metricsRaw, error }, { data: recentRows }] = await Promise.all([
    sb.rpc("admin_dashboard_metrics"),
    sb
      .from("profiles")
      .select("id, email, full_name, plan, subscription_status, total_stories, created_at, last_story_at, signup_source, signup_campaign, signup_referrer_host, referral_code, is_internal")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const queryMs = Date.now() - started;

  if (error || !metricsRaw) {
    return (
      <div className="min-h-screen bg-ink-950 p-8 text-white">
        <Link href="/admin" className="text-sm text-ink-400 hover:text-white">← Back to admin</Link>
        <p className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Could not load metrics: {error?.message ?? "no data"}
        </p>
      </div>
    );
  }

  const m = metricsRaw as Metrics;
  const recent = (recentRows ?? []).filter((r) => !r.is_internal && !(r.email ?? "").startsWith("qa-"));

  const mrr = Object.entries(m.revenue.by_plan).reduce(
    (sum, [plan, count]) => sum + (MONTHLY_PRICE[normalizePlanKey(plan)] ?? 0) * count, 0
  );
  const arpu = m.revenue.active ? Math.round(mrr / m.revenue.active) : 0;
  // Churn as a share of everyone who ever paid, which is the only honest
  // denominator at this size. Rate-per-month needs more history than we have.
  const everPaid = m.revenue.paying + m.revenue.churned;
  const churnShare = pct(m.revenue.churned, everPaid);
  const signupMax = Math.max(1, ...m.signups_per_day.map((d) => d.count));
  const storyMax = Math.max(1, ...m.stories.per_day.map((d) => d.count));
  const visitorToSignup = pct(m.users.new_30d, m.traffic.visitors_30d);

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Growth &amp; revenue</h1>
          <p className="text-xs text-ink-500">
            aggregated in Postgres · {queryMs}ms · built to stay flat past 100k accounts
          </p>
        </div>

        {/* Revenue */}
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <DollarSign className="h-4 w-4" /> Revenue
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="MRR" value={`$${mrr}`} sub="base pricing, excl. internal" tone="good" />
            <Stat label="ARR" value={`$${mrr * 12}`} />
            <Stat label="Paying" value={m.revenue.active} sub={`${m.revenue.trialing} trialing`} />
            <Stat label="ARPU" value={`$${arpu}`} />
            <Stat label="At risk" value={m.revenue.at_risk} sub="failed / past due" tone={m.revenue.at_risk ? "warn" : "default"} />
            <Stat label="Churned" value={m.revenue.churned} sub={`${churnShare}% of all who paid`} tone={churnShare > 20 ? "warn" : "default"} />
          </div>
        </section>

        {/* Acquisition funnel */}
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <MousePointerClick className="h-4 w-4" /> Funnel (30 days)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="Visitors" value={m.traffic.visitors_30d} />
            <Stat label="Tried demo" value={m.traffic.demo_started_30d} sub={`${pct(m.traffic.demo_started_30d, m.traffic.visitors_30d)}% of visitors`} />
            <Stat label="Saw a story" value={m.traffic.demo_completed_30d} sub={`${pct(m.traffic.demo_completed_30d, m.traffic.demo_started_30d)}% of tries`} />
            <Stat label="Signed up" value={m.users.new_30d} sub={`${visitorToSignup}% of visitors`} />
            <Stat label="Activated" value={m.users.activated} sub={`${pct(m.users.activated, m.users.total)}% all-time`} />
            <Stat label="Paid" value={m.revenue.paying} sub={`${pct(m.revenue.paying, m.users.activated)}% of activated`} tone="good" />
          </div>
          {m.traffic.visitors_30d === 0 && (
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              No visitor data yet. Traffic tracking starts collecting once this build is deployed.
            </p>
          )}
        </section>

        {/* Retention */}
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <Users className="h-4 w-4" /> Retention shape
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Total accounts" value={m.users.total} sub={`${m.users.new_7d} new this week`} />
            <Stat label="Never wrote one" value={m.users.total - m.users.activated} sub={`${pct(m.users.total - m.users.activated, m.users.total)}% of signups`} tone="warn" />
            <Stat label="One and done" value={m.users.one_and_done} sub="wrote exactly 1 story" tone={m.users.one_and_done > m.users.repeat ? "warn" : "default"} />
            <Stat label="Came back" value={m.users.repeat} sub="2+ stories" />
            <Stat label="Power users" value={m.users.power} sub="10+ stories" tone="good" />
          </div>
        </section>

        {/* Charts */}
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <TrendingUp className="h-4 w-4" /> Signups per day
            </h2>
            {m.signups_per_day.length ? <Bars rows={m.signups_per_day} max={signupMax} /> : <p className="text-sm text-ink-400">No signups in 30 days.</p>}
          </div>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <TrendingUp className="h-4 w-4" /> Stories per day
            </h2>
            {m.stories.per_day.length ? <Bars rows={m.stories.per_day} max={storyMax} /> : <p className="text-sm text-ink-400">No stories in 30 days.</p>}
          </div>
        </section>

        {/* Attribution: the money question */}
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <Globe className="h-4 w-4" /> Where signups came from
            </h2>
            <p className="mb-3 text-xs text-ink-500">Which channel produces customers, not just clicks.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-ink-500">
                  <tr><th className="py-1.5 font-semibold">Source</th><th className="font-semibold">Signups</th><th className="font-semibold">Activated</th><th className="font-semibold">Paid</th><th className="font-semibold">Conv.</th></tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {m.acquisition.slice(0, 12).map((a) => (
                    <tr key={a.source} className="text-ink-200">
                      <td className="py-1.5 pr-2">{a.source}</td>
                      <td className="tabular-nums">{a.signups}</td>
                      <td className="tabular-nums">{a.activated}</td>
                      <td className="tabular-nums font-bold text-white">{a.paid}</td>
                      <td className="tabular-nums text-sage-400">{pct(a.paid, a.signups)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <Globe className="h-4 w-4" /> Traffic sources (30d)
            </h2>
            <p className="mb-3 text-xs text-ink-500">Unique visitors before signup.</p>
            {m.traffic.by_source.length ? (
              <ul className="space-y-2">
                {m.traffic.by_source.slice(0, 12).map((s) => (
                  <li key={s.source} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink-200">{s.source}</span>
                    <span className="font-bold tabular-nums text-white">{s.visitors}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-400">No traffic recorded yet.</p>}
            <div className="mt-4 border-t border-ink-800 pt-3">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                <Gift className="h-3.5 w-3.5" /> Referrals
              </h3>
              <p className="text-xs text-ink-300">
                {m.referrals.total} total · {m.referrals.pending} awaiting payment · {m.referrals.credited} credited ·
                ${(m.referrals.credit_cents / 100).toFixed(2)} given away
              </p>
            </div>
          </div>
        </section>

        {/* Pages */}
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <Globe className="h-4 w-4" /> Pages visited (30d)
            </h2>
            <p className="mb-3 text-xs text-ink-500">
              {m.traffic.pageviews_30d} views from {m.traffic.visitors_30d} people.
            </p>
            {m.traffic.by_page.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-ink-500">
                    <tr><th className="py-1.5 font-semibold">Page</th><th className="font-semibold">Views</th><th className="font-semibold">People</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {m.traffic.by_page.slice(0, 15).map((p) => (
                      <tr key={p.path} className="text-ink-200">
                        <td className="py-1.5 pr-2 font-mono text-[11px]">{p.path}</td>
                        <td className="tabular-nums">{p.views}</td>
                        <td className="tabular-nums font-bold text-white">{p.visitors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-400">No page views recorded yet.</p>}
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <MousePointerClick className="h-4 w-4" /> Landing pages that convert
            </h2>
            <p className="mb-3 text-xs text-ink-500">
              The first page each visitor saw, and whether they went on to reach signup.
            </p>
            {m.traffic.landing_pages.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-ink-500">
                    <tr><th className="py-1.5 font-semibold">Landed on</th><th className="font-semibold">Sessions</th><th className="font-semibold">Reached signup</th><th className="font-semibold">Rate</th></tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {m.traffic.landing_pages.slice(0, 15).map((p) => (
                      <tr key={p.path} className="text-ink-200">
                        <td className="py-1.5 pr-2 font-mono text-[11px]">{p.path}</td>
                        <td className="tabular-nums">{p.sessions}</td>
                        <td className="tabular-nums font-bold text-white">{p.reached_signup}</td>
                        <td className="tabular-nums text-sage-400">{pct(p.reached_signup, p.sessions)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-400">No landing data yet.</p>}
            <div className="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-400">
              Devices: {m.traffic.by_device.map((d) => `${d.device} ${d.visitors}`).join(" · ") || "none"}
              <br />
              Countries: {m.traffic.by_country.slice(0, 8).map((c) => `${c.country} ${c.visitors}`).join(" · ") || "unknown"}
            </div>
          </div>
        </section>

        {/* Recent signups */}
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <AlertTriangle className="h-4 w-4" /> Newest accounts
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-ink-800">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-ink-900 text-ink-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                  <th className="px-3 py-2 font-semibold">Who</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Stories</th>
                  <th className="px-3 py-2 font-semibold">Journey</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {recent.map((p) => {
                  const stories = p.total_stories ?? 0;
                  const paid = normalizePlanKey(p.plan) !== "free";
                  const journey = !stories ? "signed up only" : paid ? "signed up → wrote → paid" : stories === 1 ? "1 story → stopped" : "writing";
                  return (
                    <tr key={p.id} className="text-ink-200">
                      <td className="px-3 py-2 text-ink-400">{p.created_at.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-white">{p.full_name || "—"}</div>
                        <div className="text-[11px] text-ink-500">{p.email}</div>
                      </td>
                      <td className="px-3 py-2">{p.signup_source || p.signup_referrer_host || <span className="text-ink-600">unknown</span>}</td>
                      <td className="px-3 py-2">{p.plan}</td>
                      <td className="px-3 py-2 font-bold tabular-nums text-white">{stories}</td>
                      <td className="px-3 py-2 text-ink-400">{journey}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
