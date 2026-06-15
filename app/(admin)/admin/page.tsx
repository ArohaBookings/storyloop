import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  DollarSign,
  LogIn,
  LogOut,
  PieChart,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMonthlyStoryLimit } from "@/lib/story-limits";
import { isBillingBlocked, isBillingPastDue, isPaidPlan } from "@/lib/billing-access";

export const metadata = { title: "Admin · StoryLoop" };

type ProfileMetric = {
  plan: string | null;
  subscription_status: string | null;
  created_at: string | null;
};

type StoryMetric = {
  created_at: string;
};

const PRICES: Record<string, number> = { educator: 19, centre: 49 };
const REVENUE_STATUSES = new Set(["active", "trialing", "admin_override"]);

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLast14Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - index));
    return {
      key: toDateKey(date),
      label: date.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    };
  });
}

function buildSparkline(values: number[]) {
  const width = 280;
  const height = 64;
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getPlanGradient(planCounts: Record<string, number>, total: number) {
  if (total === 0) return "#1a1817";
  const freeEnd = percent(planCounts.free, total) * 3.6;
  const educatorEnd = freeEnd + percent(planCounts.educator, total) * 3.6;
  return `conic-gradient(#7a706b 0deg ${freeEnd}deg, #a87851 ${freeEnd}deg ${educatorEnd}deg, #5c7e3d ${educatorEnd}deg 360deg)`;
}

export default async function AdminPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const days = getLast14Days();
  const since = `${days[0].key}T00:00:00.000Z`;
  const [
    { count: totalUsers },
    { count: totalStories },
    { data: recentUsers },
    { data: recentStories },
    { data: audit },
    { data: profilesForCharts },
    { data: storiesForChart },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("stories").select("*", { count: "exact", head: true }),
    sb.from("profiles")
      .select("id, full_name, plan, stories_this_month, subscription_status, created_at, email, monthly_story_limit_override, applied_access_code")
      .order("created_at", { ascending: false })
      .limit(12),
    sb.from("stories").select("id, child_name, age_group, created_at, profiles!inner(full_name, email)").order("created_at", { ascending: false }).limit(8),
    sb.from("admin_audit_log").select("action, target_type, target_id, created_at, details").order("created_at", { ascending: false }).limit(8),
    sb.from("profiles").select("plan, subscription_status, created_at").limit(1000),
    sb.from("stories").select("created_at").gte("created_at", since).limit(2000),
  ]);

  const profiles = (profilesForCharts ?? []) as ProfileMetric[];
  const storyRows = (storiesForChart ?? []) as StoryMetric[];
  const paidProfiles = profiles.filter((profile) => isPaidPlan(profile.plan));
  const activePaidProfiles = paidProfiles.filter((profile) => REVENUE_STATUSES.has(profile.subscription_status ?? ""));
  const billingRiskProfiles = paidProfiles.filter((profile) => isBillingBlocked(profile) || isBillingPastDue(profile));
  const trialingProfiles = paidProfiles.filter((profile) => profile.subscription_status === "trialing");
  const mrr = activePaidProfiles.reduce((sum, user) => sum + (PRICES[user.plan ?? ""] ?? 0), 0);
  const planCounts = {
    free: profiles.filter((profile) => (profile.plan ?? "free") === "free").length,
    educator: profiles.filter((profile) => profile.plan === "educator").length,
    centre: profiles.filter((profile) => profile.plan === "centre").length,
  };
  const storyCounts = days.map((day) => storyRows.filter((story) => story.created_at?.startsWith(day.key)).length);
  const sparklinePoints = buildSparkline(storyCounts);
  const maxStatusCount = Math.max(activePaidProfiles.length, trialingProfiles.length, billingRiskProfiles.length, planCounts.free, 1);

  const PLAN_BADGE: Record<string, string> = {
    free: "bg-ink-800 text-ink-300",
    educator: "bg-clay-500/20 text-clay-400 border border-clay-500/30",
    centre: "bg-sage-500/20 text-sage-400 border border-sage-500/30",
  };

  const statusRows = [
    { label: "Active paid", value: activePaidProfiles.length, colour: "bg-sage-400", text: "text-sage-300" },
    { label: "Trialing", value: trialingProfiles.length, colour: "bg-clay-400", text: "text-clay-300" },
    { label: "Billing risk", value: billingRiskProfiles.length, colour: "bg-red-400", text: "text-red-300" },
    { label: "Free users", value: planCounts.free, colour: "bg-ink-500", text: "text-ink-300" },
  ];

  return (
    <div className="min-h-screen bg-ink-950 text-paper">
      <header className="border-b border-ink-800 bg-ink-900/70 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm">StoryLoop Admin</p>
              <p className="text-[10px] text-red-400 -mt-0.5 font-mono tracking-widest truncate">SUPER ADMIN · {session.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 text-xs text-paper bg-clay-600 hover:bg-clay-500 px-3 py-1.5 rounded-lg">
              <ArrowLeft className="w-3.5 h-3.5" /> Customer dashboard
            </Link>
            <Link href="/generate" className="flex items-center gap-2 text-xs text-ink-300 hover:text-paper px-3 py-1.5 border border-ink-700 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" /> New story
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-xs text-ink-300 hover:text-paper px-3 py-1.5 border border-ink-700 rounded-lg">
              <LogIn className="w-3.5 h-3.5" /> Normal login
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="flex items-center gap-2 text-xs text-ink-400 hover:text-paper px-3 py-1.5 border border-ink-700 rounded-lg">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="w-full max-w-none p-4 sm:p-6 space-y-6">
        <div className="rounded-[2rem] border border-ink-800 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-5 md:p-6 shadow-2xl animate-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-clay-400">Live command centre</p>
              <h1 className="mt-2 font-display text-4xl font-bold">Overview</h1>
              <p className="mt-1 text-sm text-ink-400">Revenue, usage, billing risk, and customer activity at a glance.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="rounded-xl border border-ink-700 px-3 py-2 text-ink-300 hover:border-clay-500 hover:text-paper">
                Stripe
              </a>
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="rounded-xl border border-ink-700 px-3 py-2 text-ink-300 hover:border-clay-500 hover:text-paper">
                Supabase
              </a>
              <Link href="/admin/users" className="rounded-xl border border-ink-700 px-3 py-2 text-ink-300 hover:border-clay-500 hover:text-paper">
                Users
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total users", value: totalUsers ?? 0, icon: Users, color: "text-blue-400", sub: `${paidProfiles.length} on paid plans` },
            { label: "Active paid", value: activePaidProfiles.length, icon: TrendingUp, color: "text-sage-400", sub: `${billingRiskProfiles.length} billing risks` },
            { label: "MRR estimate", value: `$${mrr}`, icon: DollarSign, color: "text-amber-400", sub: `$${mrr * 12} ARR · base pricing` },
            { label: "Stories generated", value: totalStories ?? 0, icon: BookOpen, color: "text-clay-400", sub: `${storyRows.length} in last 14 days` },
          ].map(({ label, value, icon: Icon, color, sub }, index) => (
            <div key={label} className={`bg-ink-900 border border-ink-800 rounded-2xl p-5 shadow-2xl animate-fade-up-${Math.min(index + 1, 4)}`}>
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-ink-400 mt-0.5">{label}</p>
              <p className="text-[10px] text-ink-500 mt-1 font-mono">{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5 animate-fade-up-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clay-400">Plan mix</p>
                <h2 className="font-display text-2xl font-bold mt-1">Free to paid funnel</h2>
              </div>
              <PieChart className="w-5 h-5 text-ink-500" />
            </div>
            <div className="flex items-center gap-5">
              <div className="relative h-32 w-32 flex-shrink-0 rounded-full" style={{ background: getPlanGradient(planCounts, profiles.length) }}>
                <div className="absolute inset-5 rounded-full bg-ink-900 flex items-center justify-center text-center">
                  <div>
                    <p className="font-display text-2xl font-bold">{profiles.length}</p>
                    <p className="text-[10px] text-ink-500">users</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {[
                  { label: "Free", value: planCounts.free, dot: "bg-ink-500" },
                  { label: "Educator", value: planCounts.educator, dot: "bg-clay-500" },
                  { label: "Centre", value: planCounts.centre, dot: "bg-sage-500" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-ink-300"><span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />{row.label}</span>
                      <span className="font-mono text-ink-500">{row.value} · {percent(row.value, profiles.length)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div className={`h-full rounded-full ${row.dot}`} style={{ width: `${percent(row.value, profiles.length)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5 animate-fade-up-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clay-400">Story activity</p>
                <h2 className="font-display text-2xl font-bold mt-1">Last 14 days</h2>
              </div>
              <BarChart3 className="w-5 h-5 text-ink-500" />
            </div>
            <svg viewBox="0 0 280 72" className="h-28 w-full overflow-visible" role="img" aria-label="Stories generated over the last 14 days">
              <defs>
                <linearGradient id="storySpark" x1="0" x2="1">
                  <stop offset="0%" stopColor="#a87851" />
                  <stop offset="100%" stopColor="#e8c155" />
                </linearGradient>
              </defs>
              <polyline points={sparklinePoints} fill="none" stroke="url(#storySpark)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {storyCounts.map((value, index) => {
                const [x, y] = sparklinePoints.split(" ")[index].split(",");
                return <circle key={`${days[index].key}-${value}`} cx={x} cy={y} r="3.5" fill="#fbf8f2" stroke="#a87851" strokeWidth="2" />;
              })}
            </svg>
            <div className="grid grid-cols-7 gap-1 text-[9px] text-ink-600">
              {days.filter((_, index) => index % 2 === 1).map((day) => <span key={day.key}>{day.label}</span>)}
            </div>
          </div>

          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5 animate-fade-up-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-clay-400">Billing health</p>
                <h2 className="font-display text-2xl font-bold mt-1">Access risk</h2>
              </div>
              <AlertTriangle className={`w-5 h-5 ${billingRiskProfiles.length ? "text-red-400" : "text-sage-400"}`} />
            </div>
            <div className="space-y-4">
              {statusRows.map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-300">{row.label}</span>
                    <span className={`font-bold ${row.text}`}>{row.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
                    <div className={`h-full rounded-full ${row.colour}`} style={{ width: `${Math.max((row.value / maxStatusCount) * 100, row.value ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-ink-800 flex items-center justify-between">
              <h3 className="font-semibold">Recent users</h3>
              <Link href="/admin/users" className="text-xs text-clay-400 hover:text-clay-300">View all {"->"}</Link>
            </div>
            {!recentUsers?.length ? (
              <p className="p-8 text-center text-sm text-ink-500">No users yet</p>
            ) : (
              <div className="divide-y divide-ink-800/50">
                {recentUsers.map(u => (
                  <div key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-ink-800/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-clay-700 flex items-center justify-center text-xs font-bold text-paper flex-shrink-0">
                        {(u.full_name ?? u.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-ink-500 truncate">{u.email}</p>
                        {u.applied_access_code && <p className="text-[10px] text-clay-400 mt-0.5">{u.applied_access_code.toUpperCase()} access</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-ink-500">
                        {u.stories_this_month ?? 0}
                        {(() => {
                          const limit = getMonthlyStoryLimit(u);
                          return limit === null ? "" : `/${limit}`;
                        })()} stories
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.free}`}>{u.plan}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-ink-400" />
              <h3 className="font-semibold text-sm">Admin activity</h3>
            </div>
            {!audit?.length ? (
              <p className="text-sm text-ink-500">Nothing yet</p>
            ) : (
              <div className="space-y-2.5">
                {audit.map((log, i) => (
                  <div key={i} className="text-xs border-l-2 border-clay-500 pl-3 py-1">
                    <p className="text-ink-200 font-medium">{log.action}</p>
                    <p className="text-ink-500 text-[10px] mt-0.5">{new Date(log.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-800">
            <h3 className="font-semibold">Recent stories generated</h3>
          </div>
          {!recentStories?.length ? (
            <p className="p-8 text-center text-sm text-ink-500">No stories yet</p>
          ) : (
            <div className="divide-y divide-ink-800/50">
              {recentStories.map((s: any) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{s.profiles?.full_name ?? s.profiles?.email}</span>
                    <span className="text-ink-500 ml-2">wrote about</span>
                    <span className="font-medium ml-1">{s.child_name ?? "—"}</span>
                    {s.age_group && <span className="text-ink-500 ml-1">· {s.age_group}</span>}
                  </div>
                  <span className="text-xs text-ink-500">{new Date(s.created_at).toLocaleDateString("en-AU")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
          <Link href="/admin/users" className="bg-ink-900 border border-ink-800 hover:border-clay-500/50 rounded-xl p-4 transition-all">
            <p className="text-sm font-semibold">Manage users {"->"}</p>
            <p className="text-xs text-ink-500 mt-0.5">Reset passwords, change plans, disable</p>
          </Link>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="bg-ink-900 border border-ink-800 hover:border-clay-500/50 rounded-xl p-4 transition-all">
            <p className="text-sm font-semibold">Stripe dashboard {"->"}</p>
            <p className="text-xs text-ink-500 mt-0.5">View subscriptions, invoices, dunning</p>
          </a>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="bg-ink-900 border border-ink-800 hover:border-clay-500/50 rounded-xl p-4 transition-all">
            <p className="text-sm font-semibold">Supabase {"->"}</p>
            <p className="text-xs text-ink-500 mt-0.5">Database, auth, logs</p>
          </a>
        </div>
      </main>
    </div>
  );
}
