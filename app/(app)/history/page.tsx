import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";

export const metadata = { title: "Story history" };

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

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
    <div className="p-6 md:p-8 max-w-5xl">
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
          {stories.map((story) => {
            const metadata =
              story.metadata && typeof story.metadata === "object"
                ? (story.metadata as Record<string, unknown>)
                : {};
            const learningSummary =
              typeof metadata.learningSummary === "string" ? metadata.learningSummary : "";
            const learningDispositions = asStringArray(metadata.learningDispositions);
            const socialEmotionalLinks = asStringArray(metadata.socialEmotionalLinks);
            const culturalConnections = asStringArray(metadata.culturalConnections);
            const whanauConnection =
              typeof metadata.whanauConnection === "string" ? metadata.whanauConnection : "";

            return (
              <details key={story.id} className="card p-6 group cursor-pointer">
                <summary className="list-none flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-display font-bold text-ink-900">{story.child_name ?? "Learning story"}</p>
                      {story.age_group && <span className="text-xs text-ink-500">· {story.age_group}</span>}
                      <span className="text-xs text-ink-400">
                        · {new Date(story.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600 line-clamp-2">{story.story_text.slice(0, 200)}...</p>
                    {story.outcomes?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {story.outcomes.map((outcome: string) => (
                          <span key={outcome} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">
                            {outcome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>

                <div className="mt-5 pt-5 border-t border-clay-100">
                  <div className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap font-display">
                    {story.story_text}
                  </div>

                  {(learningSummary ||
                    learningDispositions.length > 0 ||
                    socialEmotionalLinks.length > 0 ||
                    culturalConnections.length > 0 ||
                    story.next_steps?.length > 0 ||
                    whanauConnection) && (
                    <div className="mt-5 space-y-4">
                      {learningSummary && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">What this learning shows</p>
                          <p className="text-sm text-ink-700">{learningSummary}</p>
                        </div>
                      )}

                      {learningDispositions.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Learning dispositions</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {learningDispositions.map((item) => (
                              <span key={item} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {socialEmotionalLinks.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Social and emotional learning</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {socialEmotionalLinks.map((item) => (
                              <span key={item} className="text-[10px] font-mono bg-sage-50 text-sage-700 px-2 py-0.5 rounded-full border border-sage-100">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {culturalConnections.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Cultural and language links</p>
                          <ul className="space-y-1 text-sm text-ink-700">
                            {culturalConnections.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {story.next_steps?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Possible next steps</p>
                          <ul className="space-y-1 text-sm text-ink-700">
                            {story.next_steps.map((item: string) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {whanauConnection && (
                        <div>
                          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Family or whanau link</p>
                          <p className="text-sm text-ink-700">{whanauConnection}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
