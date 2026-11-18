import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { saveTeamReview } from "@/lib/centre-team-server";

/**
 * A leader's answer on a story her team shared: "looks good", or a short note
 * the author sees on her story (18 Nov 2026).
 *
 * Who may answer is decided in lib/centre-team.ts canReviewStory: a leader of a
 * centre on a live plan, on a story by an active member of that centre who
 * shares her stories, never her own. Anything else gets the same 404, so this
 * route never says whether a story exists.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const storyId = typeof body.storyId === "string" ? body.storyId : "";
    if (!UUID.test(storyId)) return NextResponse.json({ error: "That story is not shared with you." }, { status: 404 });

    const allowed = await consumeRateLimit({ scope: "team-review", key: user.id, limit: 120, windowSeconds: 60 * 10 });
    if (!allowed) return NextResponse.json({ error: "That is a lot at once. Wait a minute and try again." }, { status: 429 });

    const result = await saveTeamReview(user.id, storyId, { status: body.status, note: body.note });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ review: result.review });
  } catch (error) {
    console.error("Team review error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "That did not save. Try again." }, { status: 500 });
  }
}
