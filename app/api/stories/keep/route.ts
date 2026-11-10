import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { consumeRateLimit } from "@/lib/rate-limit";
import { KEEP_STORY_MAX_AGE_MS, cleanKeptStory, keptStoryTitle } from "@/lib/keep-story";

/**
 * Saves the story a visitor wrote in the no-signup demo into their new account
 * (lib/keep-story.ts explains why). No AI call: the draft already exists. It
 * counts as their first story, not as one of their free stories this month.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first.", code: "unauthenticated" }, { status: 401 });

  const kept = cleanKeptStory(await request.json().catch(() => null));
  if (!kept) return NextResponse.json({ error: "That story could not be kept.", code: "invalid" }, { status: 400 });

  // A reload before the first save answered sends the same story again: hand
  // back the one already saved rather than a second copy.
  const { data: earlier } = await supabase
    .from("stories")
    .select("id, story_text")
    .eq("user_id", user.id)
    .eq("metadata->>keptFromDemo", "true")
    .gte("created_at", new Date(Date.now() - KEEP_STORY_MAX_AGE_MS).toISOString())
    .limit(10);
  const same = (earlier ?? []).find((row) => row.story_text === kept.story);
  if (same) return NextResponse.json({ ok: true, storyId: same.id, already: true });

  const allowed = await consumeRateLimit({ scope: "keep-story", key: user.id, limit: 3, windowSeconds: 86_400 });
  if (!allowed) return NextResponse.json({ error: "Try again tomorrow.", code: "rate_limited" }, { status: 429 });

  const profile = await getAccessProfile(user);
  const { data: saved, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      child_id: null,
      observations: kept.note,
      story_text: kept.story,
      location: kept.framework ?? "AU",
      word_count: kept.story.split(/\s+/).filter(Boolean).length,
      metadata: {
        storyTitle: keptStoryTitle(kept.story),
        keptFromDemo: true,
        inputMethod: "demo",
        followUpStatus: "open",
      },
    })
    .select("id")
    .single();
  if (error || !saved) {
    console.error("Keep story failed:", error?.message);
    return NextResponse.json({ error: "That story could not be saved. It is still in this browser; try again in a minute.", code: "save_failed" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { total_stories: (profile.total_stories ?? 0) + 1, last_story_at: now };
  if ((profile.total_stories ?? 0) === 0) update.first_story_created_at = now;
  await supabase.from("profiles").update(update).eq("id", user.id);

  return NextResponse.json({ ok: true, storyId: saved.id });
}
