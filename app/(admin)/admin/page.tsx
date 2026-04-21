import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { Users, TrendingUp, DollarSign, BookOpen, LogOut, ShieldAlert, Activity } from "lucide-react";

export const metadata = { title: "Admin · StoryLoop" };

const PRICES: Record<string, number> = { educator: 19, centre: 49 };

export default async function AdminPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const [
    { count: totalUsers },
    { count: paidUsers },
    { data: recentUsers },
    { count: totalStories },
    { data: recentStories },
    { data: audit },
    { data: payingUsers },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("profiles").select("*", { count: "exact", head: true }).neq("plan", "free"),
    sb.from("profiles").select("id, full_name, plan, stories_this_month, subscription_status, created_at, email").order("created_at", { ascending: false }).limit(12),
    sb.from("stories").select("*", { count: "exact", head: true }),
    sb.from("stories").select("id, child_name, age_group, created_at, profiles!inner(full_name, email)").order("created_at", { ascending: false }).limit(8),
    sb.from("admin_audit_log").select("action, target_type, target_id, created_at, details").order("created_at", { ascending: false }).limit(8),
    sb.from("profiles").select("plan").neq("plan", "free"),
  ]);

  const mrr = (payingUsers ?? []).reduce((s, p) => s + (PRICES[p.plan] ?? 0), 0);

  const PLAN_BADGE: Record<string, string> = {
    free: "bg-ink-800 text-ink-300",
    educator: "bg-clay-500/20 text-clay-400 border border-clay-500/30",
    centre: "bg-sage-500/20 text-sage-400 border border-sage-500/30",
  };

  return (
    <div className="min-h-screen bg-ink-950 text-paper">
      {/* Header */}
      <header className="h-14 border-b border-ink-800 bg-ink-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm">StoryLoop Admin</p>
            <p className="text-[10px] text-red-400 -mt-0.5 font-mono tracking-widest">SUPER ADMIN · {session.email}</p>
          </div>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="flex items-center gap-2 text-xs text-ink-400 hover:text-paper px-3 py-1.5 border border-ink-700 rounded-lg">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </form>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="font-display text-3xl font-bold">Overview</h1>
          <p className="text-sm text-ink-400 mt-0.5">Real-time metrics · everything at a glance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total users", value: totalUsers ?? 0, icon: Users, color: "text-blue-400" },
            { label: "Paying customers", value: paidUsers ?? 0, icon: TrendingUp, color: "text-sage-400" },
            { label: "MRR", value: `$${mrr}`, icon: DollarSign, color: "text-amber-400", sub: `AUD/mo · $${mrr * 12} ARR` },
            { label: "Stories generated", value: totalStories ?? 0, icon: BookOpen, color: "text-clay-400" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-ink-900 border border-ink-800 rounded-2xl p-5">
              <Icon className={`w-5 h-5 ${color} mb-3`} />
              <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-ink-400 mt-0.5">{label}</p>
              {sub && <p className="text-[10px] text-ink-500 mt-1 font-mono">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Recent users + audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-ink-800 flex items-center justify-between">
              <h3 className="font-semibold">Recent users</h3>
              <Link href="/admin/users" className="text-xs text-clay-400 hover:text-clay-300">View all →</Link>
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
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-ink-500">{u.stories_this_month ?? 0} stories</span>
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

        {/* Recent stories */}
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
            <p className="text-sm font-semibold">Manage users →</p>
            <p className="text-xs text-ink-500 mt-0.5">Reset passwords, change plans, disable</p>
          </Link>
          <a href={`https://dashboard.stripe.com`} target="_blank" rel="noopener" className="bg-ink-900 border border-ink-800 hover:border-clay-500/50 rounded-xl p-4 transition-all">
            <p className="text-sm font-semibold">Stripe dashboard →</p>
            <p className="text-xs text-ink-500 mt-0.5">View subscriptions, revenue, refunds</p>
          </a>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="bg-ink-900 border border-ink-800 hover:border-clay-500/50 rounded-xl p-4 transition-all">
            <p className="text-sm font-semibold">Supabase →</p>
            <p className="text-xs text-ink-500 mt-0.5">Database, auth, logs</p>
          </a>
        </div>
      </main>
    </div>
  );
}
