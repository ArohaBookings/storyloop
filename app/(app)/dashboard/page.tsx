import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles, Clock, BookOpen, TrendingUp } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: recentStories, count: totalStories }] = await Promise.all([
    supabase.from("profiles").select("full_name, plan, stories_this_month").eq("id", user!.id).single(),
    supabase.from("stories").select("id, story_text, outcomes, age_group, child_name, created_at", { count: "exact" })
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const plan = profile?.plan ?? "free";
  const used = profile?.stories_this_month ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <p className="section-title mb-2">{greeting}</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">Hi {firstName}. Ready to write?</h1>
        <p className="text-ink-600 mt-1">Turn your observations into a beautiful learning story in seconds.</p>
      </div>

      {/* Quick action */}
      <div className="card-warm p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Start a new story</h2>
            <p className="text-sm text-ink-600">Voice note, bullet points, or a messy braindump. We'll shape it.</p>
          </div>
          <Link href="/generate" className="btn-primary text-base whitespace-nowrap">
            <Sparkles className="w-4 h-4" /> New story
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Stories this month", value: used, icon: BookOpen, sub: plan === "free" ? `${3 - used} free left` : "Unlimited" },
          { label: "Total stories", value: totalStories ?? 0, icon: TrendingUp, sub: "Lifetime" },
          { label: "Current plan", value: plan.charAt(0).toUpperCase() + plan.slice(1), icon: Clock, sub: plan === "free" ? "Upgrade for more" : "Active" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-cream-100 border border-clay-200 flex items-center justify-center">
                <Icon className="w-4 h-4 text-clay-700" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
            <p className="text-xs text-ink-500 mt-0.5">{label}</p>
            <p className="text-xs text-clay-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent stories */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-clay-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">Recent stories</h2>
          <Link href="/history" className="text-sm text-clay-700 hover:text-clay-900 font-semibold">View all →</Link>
        </div>
        {!recentStories?.length ? (
          <div className="p-14 text-center">
            <BookOpen className="w-12 h-12 text-clay-300 mx-auto mb-4" />
            <p className="font-display text-lg font-bold text-ink-900 mb-1">No stories yet</p>
            <p className="text-sm text-ink-500 mb-5">Write your first learning story — takes 30 seconds.</p>
            <Link href="/generate" className="btn-primary"><Sparkles className="w-4 h-4" /> Write first story</Link>
          </div>
        ) : (
          <div className="divide-y divide-clay-50">
            {recentStories.map(s => (
              <Link key={s.id} href={`/history`} className="block px-6 py-4 hover:bg-cream-50 transition-colors">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {s.child_name ?? "Learning story"} {s.age_group && <span className="text-xs text-ink-500 font-normal">· {s.age_group}</span>}
                  </p>
                  <span className="text-xs text-ink-400 flex-shrink-0">{new Date(s.created_at).toLocaleDateString("en-AU")}</span>
                </div>
                <p className="text-sm text-ink-600 line-clamp-2">{s.story_text?.slice(0, 180)}...</p>
                {s.outcomes?.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {s.outcomes.slice(0, 3).map((o: string) => (
                      <span key={o} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">{o}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
