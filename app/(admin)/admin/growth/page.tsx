import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey } from "@/lib/plans";

export const metadata = { title: "Growth · StoryLoop Admin" };
export const dynamic = "force-dynamic";

type PageEvent = {
  event_type: string;
  session_id: string;
  path: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device: string | null;
  country: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  total_stories: number | null;
  stories_this_month: number | null;
  created_at: string;
  first_story_created_at: string | null;
  last_story_at: string | null;
  last_seen_at: string | null;
  upgraded_at: string | null;
  signup_source: string | null;
  signup_campaign: string | null;
  signup_referrer_host: string | null;
  is_internal: boolean | null;
};

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export default async function GrowthPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: eventRows }, { data: profileRows }] = await Promise.all([
    sb
      .from("page_events")
      .select("event_type, session_id, path, referrer_host, utm_source, utm_campaign, device, country, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    sb
      .from("profiles")
      .select(
        "id, email, full_name, plan, subscription_status, total_stories, stories_this_month, created_at, first_story_created_at, last_story_at, last_seen_at, upgraded_at, signup_source, signup_campaign, signup_referrer_host, is_internal"
      )
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const events = (eventRows ?? []) as PageEvent[];
  const allProfiles = (profileRows ?? []) as ProfileRow[];
  const profiles = allProfiles.filter(
    (p) => !p.is_internal && !(p.email ?? "").startsWith("qa-") && !(p.email ?? "").includes("storyloop.test")
  );

  // ---- Visitor funnel (anonymous) ----
  const sessionsOf = (type: string) => new Set(events.filter((e) => e.event_type === type).map((e) => e.session_id));
  const visitors = sessionsOf("page_view");
  const demoStarted = sessionsOf("demo_started");
  const demoCompleted = sessionsOf("demo_completed");
  const demoClarified = sessionsOf("demo_clarification");
  const demoErrored = sessionsOf("demo_error");
  const signupViews = sessionsOf("signup_view");
  const signupsDone = sessionsOf("signup_completed");

  // ---- Traffic sources ----
  const sourceCounts = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.event_type !== "page_view") continue;
    const key = e.utm_source || e.referrer_host || "direct";
    if (!sourceCounts.has(key)) sourceCounts.set(key, new Set());
    sourceCounts.get(key)!.add(e.session_id);
  }
  const sources = [...sourceCounts.entries()]
    .map(([name, set]) => ({ name, visitors: set.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 12);

  // ---- Visits by day ----
  const byDay = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.event_type !== "page_view") continue;
    const key = dayKey(e.created_at);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(e.session_id);
  }
  const days = [...byDay.entries()].map(([d, s]) => ({ day: d, visitors: s.size })).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  const maxDay = Math.max(1, ...days.map((d) => d.visitors));

  // ---- Device / country ----
  const deviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "page_view") continue;
    deviceCounts.set(e.device ?? "unknown", (deviceCounts.get(e.device ?? "unknown") ?? 0) + 1);
    if (e.country) countryCounts.set(e.country, (countryCounts.get(e.country) ?? 0) + 1);
  }

  // ---- User map ----
  const activated = profiles.filter((p) => (p.total_stories ?? 0) > 0);
  const oneAndDone = profiles.filter((p) => (p.total_stories ?? 0) === 1);
  const paying = profiles.filter((p) => normalizePlanKey(p.plan) !== "free");
  const churned = allProfiles.filter((p) => (p.subscription_status ?? "") === "cancelled" && !p.is_internal);

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>

        <h1 className="font-display text-3xl font-bold">Growth &amp; attribution</h1>
        <p className="mt-1 text-sm text-ink-400">
          Where visitors come from, what they do before signing up, and what happens after. Last 30 days.
        </p>

        {events.length === 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            No visitor events recorded yet. Traffic tracking starts collecting from the moment this build is deployed.
          </div>
        )}

        {/* Visitor funnel */}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <MousePointerClick className="h-4 w-4" /> Visitor funnel (anonymous)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Unique visitors" value={visitors.size} />
            <Stat label="Tried the demo" value={demoStarted.size} sub={pct(demoStarted.size, visitors.size) + " of visitors"} />
            <Stat label="Got a story" value={demoCompleted.size} sub={pct(demoCompleted.size, demoStarted.size) + " of tries"} />
            <Stat label="Reached signup" value={signupViews.size} sub={pct(signupViews.size, visitors.size) + " of visitors"} />
            <Stat label="Signed up" value={signupsDone.size} sub={pct(signupsDone.size, visitors.size) + " of visitors"} />
          </div>
          {(demoClarified.size > 0 || demoErrored.size > 0) && (
            <p className="mt-3 text-xs text-ink-400">
              Demo asked for more detail: <strong className="text-white">{demoClarified.size}</strong> ·
              Demo errored: <strong className="text-white">{demoErrored.size}</strong>
              {demoStarted.size > 0 && demoCompleted.size === 0 && " — visitors are trying the demo but never seeing a story."}
            </p>
          )}
        </section>

        {/* Sources + days */}
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <Globe className="h-4 w-4" /> Traffic sources
            </h2>
            {sources.length === 0 ? (
              <p className="text-sm text-ink-400">No traffic recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink-200">{s.name}</span>
                    <span className="font-bold text-white">{s.visitors}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-ink-800 pt-3 text-xs text-ink-400">
              Devices: {[...deviceCounts.entries()].map(([d, c]) => `${d} ${c}`).join(" · ") || "none"}
              <br />
              Countries: {[...countryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, n]) => `${c} ${n}`).join(" · ") || "unknown"}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
              <TrendingUp className="h-4 w-4" /> Visitors per day
            </h2>
            {days.length === 0 ? (
              <p className="text-sm text-ink-400">No traffic recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {days.map((d) => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-ink-400">{d.day.slice(5)}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-800">
                      <div className="h-full rounded-full bg-clay-500" style={{ width: `${(d.visitors / maxDay) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right font-bold text-white">{d.visitors}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* User map */}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-300">
            <Users className="h-4 w-4" /> User map ({profiles.length} real accounts)
          </h2>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Signups" value={profiles.length} />
            <Stat label="Activated" value={activated.length} sub={pct(activated.length, profiles.length) + " made a story"} />
            <Stat label="One and done" value={oneAndDone.length} sub="made exactly 1 story" />
            <Stat label="Paying" value={paying.length} sub={pct(paying.length, profiles.length) + " of signups"} />
            <Stat label="Churned" value={churned.length} sub="cancelled" />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-ink-800">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-ink-900 text-ink-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Signed up</th>
                  <th className="px-3 py-2 font-semibold">Who</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Stories</th>
                  <th className="px-3 py-2 font-semibold">Last story</th>
                  <th className="px-3 py-2 font-semibold">Journey</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {profiles.slice(0, 120).map((p) => {
                  const stories = p.total_stories ?? 0;
                  const paid = normalizePlanKey(p.plan) !== "free";
                  const journey = !p.first_story_created_at
                    ? "signed up only"
                    : paid
                      ? "signed up → stories → paid"
                      : stories === 1
                        ? "signed up → 1 story → stopped"
                        : "signed up → stories";
                  return (
                    <tr key={p.id} className="text-ink-200">
                      <td className="px-3 py-2 text-ink-400">{p.created_at.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-white">{p.full_name || "—"}</div>
                        <div className="text-[11px] text-ink-500">{p.email}</div>
                      </td>
                      <td className="px-3 py-2">
                        {p.signup_source || p.signup_referrer_host || <span className="text-ink-600">unknown</span>}
                        {p.signup_campaign && <div className="text-[11px] text-ink-500">{p.signup_campaign}</div>}
                      </td>
                      <td className="px-3 py-2">{p.plan}</td>
                      <td className="px-3 py-2">{p.subscription_status}</td>
                      <td className="px-3 py-2 font-bold text-white">{stories}</td>
                      <td className="px-3 py-2 text-ink-400">{p.last_story_at ? p.last_story_at.slice(0, 10) : "—"}</td>
                      <td className="px-3 py-2 text-ink-400">{journey}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Source shows &quot;unknown&quot; for accounts created before attribution tracking existed.
          </p>
        </section>
      </div>
    </div>
  );
}
