import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { cleanRating, shouldAskAtStory } from "@/lib/review-ask";

const ASK_EVENTS = ["review_ask_shown", "story_rating"];

/**
 * Whether to show the review row under this story (lib/review-ask.ts).
 * Saying yes records that it was shown, so the next ask is a month away on
 * every device. Best effort throughout: any failure means no ask today.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ask: false }, { status: 401 });

  try {
    const admin = createAdminSupabase();
    const [{ count: stories }, { count: reviews, error: reviewError }, { data: profile }, { data: last }] = await Promise.all([
      admin.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("profiles").select("is_internal").eq("id", user.id).maybeSingle(),
      admin.from("page_events").select("created_at").eq("user_id", user.id).in("event_type", ASK_EVENTS).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const ask =
      !reviewError &&
      shouldAskAtStory({
        stories: stories ?? 0,
        reviews: reviews ?? 0,
        internal: Boolean(profile?.is_internal),
        lastAskedAt: (last?.created_at as string | undefined) ?? null,
      });
    if (!ask) return NextResponse.json({ ask: false }, { headers: { "Cache-Control": "no-store" } });
    // Inline, not recordServerEvent: that helper swallows insert errors, and
    // this row is the only record that the ask was shown. If it is not
    // written, saying yes would put the ask under every story, so the answer
    // is no until it can be recorded. Same row shape as recordServerEvent.
    const { error: shownError } = await admin.from("page_events").insert({
      event_type: "review_ask_shown",
      session_id: `user:${user.id}`.slice(0, 60),
      user_id: user.id,
      path: "/generate",
      device: "server",
      metadata: { source: "server" },
    });
    if (shownError) {
      console.error("Review ask not recorded:", shownError.message);
      return NextResponse.json({ ask: false }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ask: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ask: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** One tap on a star. A number only; the sentence, if any, goes through /api/reviews. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rating = cleanRating(body.rating);
  if (!rating) return NextResponse.json({ error: "Choose a star rating." }, { status: 400 });

  const allowed = await consumeRateLimit({ scope: "story-rating", key: user.id, limit: 5, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ ok: true });

  await recordServerEvent(createAdminSupabase(), { event: "story_rating", userId: user.id, path: "/generate", metadata: { rating } });
  return NextResponse.json({ ok: true });
}
