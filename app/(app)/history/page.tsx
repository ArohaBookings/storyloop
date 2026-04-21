import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";

export const metadata = { title: "Story history" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: stories } = await supabase.from("stories").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Your stories</h1>
          <p className="text-ink-600 text-sm mt-1">{stories?.length ?? 0} stories saved · all yours to keep</p>
        </div>
        <Link href="/generate" className="btn-primary"><Sparkles className="w-4 h-4" /> New story</Link>
      </div>

      {!stories?.length ? (
        <div className="card p-14 text-center">
          <BookOpen className="w-12 h-12 text-clay-300 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-ink-900 mb-1">No stories yet</p>
          <p className="text-sm text-ink-500 mb-5">Your generated stories will appear here.</p>
          <Link href="/generate" className="btn-primary"><Sparkles className="w-4 h-4" /> Write first story</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map(s => (
            <details key={s.id} className="card p-6 group cursor-pointer">
              <summary className="list-none flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-display font-bold text-ink-900">{s.child_name ?? "Learning story"}</p>
                    {s.age_group && <span className="text-xs text-ink-500">· {s.age_group}</span>}
                    <span className="text-xs text-ink-400">· {new Date(s.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <p className="text-sm text-ink-600 line-clamp-2">{s.story_text.slice(0, 200)}...</p>
                  {s.outcomes?.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {s.outcomes.map((o: string) => <span key={o} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">{o}</span>)}
                    </div>
                  )}
                </div>
                <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-5 pt-5 border-t border-clay-100">
                <div className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap font-display">
                  {s.story_text}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
