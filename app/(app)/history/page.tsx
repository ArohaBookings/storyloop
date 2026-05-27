import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import StoryHistoryItem from "@/components/app/StoryHistoryItem";

export const metadata = { title: "Story history" };

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: stories } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Your stories</h1>
          <p className="text-ink-600 text-sm mt-1">{stories?.length ?? 0} stories saved · all yours to keep</p>
        </div>
        <Link href="/generate" className="btn-primary">
          <Sparkles className="w-4 h-4" /> New story
        </Link>
      </div>

      {!stories?.length ? (
        <div className="card p-14 text-center">
          <BookOpen className="w-12 h-12 text-clay-300 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-ink-900 mb-1">No stories yet</p>
          <p className="text-sm text-ink-500 mb-5">Your generated stories will appear here.</p>
          <Link href="/generate" className="btn-primary">
            <Sparkles className="w-4 h-4" /> Write first story
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryHistoryItem key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
