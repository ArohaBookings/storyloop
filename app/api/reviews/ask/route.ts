import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { sanitizeEventMetadata } from "@/lib/analytics/events";
import { ASKED_EVENTS, COPY_EVENTS, DISMISSED_EVENT, cleanRating, cleanStoryId, countCopies, shouldAskAtCopy } from "@/lib/review-ask";

const NO = { ask: false };
const NO_STORE = { "Cache-Control": "no-store" };
/** Where the copy happened, from a fixed list (the event's path). */
const PAGES = ["/generate", "/history"];
const pageFrom = (value: unknown) => (typeof value === "string" && PAGES.includes(value) ? value : "/generate");

/**
 * Whether to show the review ask now (lib/review-ask.ts). The page asks only
 * at the moment she copies a story (?at=copy&story=<id>); any other request,
 * such as a tab still open from before this release asking when a story is
 * written, is told no. Saying yes records that it was shown, so the next ask
 * is a month away on every device. Best effort throughout: any failure means
 * no ask today.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(NO, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get("at") !== "copy") return NextResponse.json(NO, { headers: NO_STORE });
  const storyId = cleanStoryId(searchParams.get("story"));
  const path = pageFrom(searchParams.get("page"));

  try {
    const admin = createAdminSupabase();
    const [copies, { count: reviews, error: reviewError }, { data: profile }, { data: last }, { data: dismissed, error: dismissedError }] = await Promise.all([
      admin.from("page_events").select("metadata").eq("user_id", user.id).in("event_type", [...COPY_EVENTS]).order("created_at", { ascending: false }).limit(200),
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("profiles").select("is_internal").eq("id", user.id).maybeSingle(),
      admin.from("page_events").select("created_at").eq("user_id", user.id).in("event_type", [...ASKED_EVENTS]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("page_events").select("id").eq("user_id", user.id).eq("event_type", DISMISSED_EVENT).limit(1),
    ]);
    // Unsure is no: an ask is never worth a guess.
    if (copies.error || reviewError || dismissedError) return NextResponse.json(NO, { headers: NO_STORE });
    const ask = shouldAskAtCopy({
      copies: countCopies(copies.data ?? []),
      reviews: reviews ?? 0,
      internal: Boolean(profile?.is_internal),
      dismissed: (dismissed ?? []).length > 0,
      lastAskedAt: (last?.created_at as string | undefined) ?? null,
    });
    if (!ask) return NextResponse.json(NO, { headers: NO_STORE });
    // Inline, not recordServerEvent: that helper swallows insert errors, and
    // this row is the only record that the ask was shown. If it is not
    // written, saying yes would ask at every copy, so the answer is no until
    // it can be recorded. Same row shape as recordServerEvent.
    const { error: shownError } = await admin.from("page_events").insert({
      event_type: "review_ask_shown",
      session_id: `user:${user.id}`.slice(0, 60),
      user_id: user.id,
      path,
      device: "server",
      metadata: { ...sanitizeEventMetadata("review_ask_shown", { story_id: storyId }), source: "server" },
    });
    if (shownError) {
      console.error("Review ask not recorded:", shownError.message);
      return NextResponse.json(NO, { headers: NO_STORE });
    }
    return NextResponse.json({ ask: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json(NO, { headers: NO_STORE });
  }
}

/**
 * One tap: a star (a number only; the sentence, if any, goes through
 * /api/reviews), or "No thanks", after which she is never asked again.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const storyId = cleanStoryId(body.story_id);
  const path = pageFrom(body.page);
  const dismiss = body.dismiss === true;
  const rating = dismiss ? null : cleanRating(body.rating);
  if (!dismiss && !rating) return NextResponse.json({ error: "Choose a star rating." }, { status: 400 });

  const allowed = await consumeRateLimit({ scope: "story-rating", key: user.id, limit: 5, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ ok: true });

  const admin = createAdminSupabase();
  if (dismiss) {
    await recordServerEvent(admin, { event: DISMISSED_EVENT, userId: user.id, path, metadata: sanitizeEventMetadata(DISMISSED_EVENT, { story_id: storyId }) ?? {} });
    return NextResponse.json({ ok: true });
  }
  await recordServerEvent(admin, { event: "review_ask_sent", userId: user.id, path, metadata: sanitizeEventMetadata("review_ask_sent", { story_id: storyId, rating }) ?? {} });
  return NextResponse.json({ ok: true });
}
