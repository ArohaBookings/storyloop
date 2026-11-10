import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/email/config";
import { checkExpiry, checkUrl, educatorView, type CheckRow } from "@/lib/story-check";
import { newCheckToken } from "@/lib/story-check-token";

type RouteContext = { params: Promise<{ id: string }> };

const COLUMNS = "id, story_id, user_id, status, leader_name, comment, created_at, opened_at, decided_at, expires_at, revoked_at";

/** The signed-in educator and proof that the story is theirs, or the response to send instead. */
async function ownStory(context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const { data: story } = await supabase.from("stories").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!story) return { error: NextResponse.json({ error: "Story not found." }, { status: 404 }) };
  return { user, storyId: story.id as string };
}

async function latestCheck(storyId: string, userId: string) {
  const { data } = await createAdminSupabase()
    .from("story_checks")
    .select(COLUMNS)
    .eq("story_id", storyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as CheckRow | null) ?? null;
}

/** Where this story's check stands: waiting, opened, or what the leader said. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;
    return NextResponse.json({ check: educatorView(await latestCheck(own.storyId, own.user.id)) });
  } catch (error) {
    console.error("Leader check status error:", error);
    return NextResponse.json({ error: "Could not load that." }, { status: 500 });
  }
}

/**
 * Make a private link to this one story for a leader to check. The link is
 * returned once and never stored: only its hash is. Any earlier unanswered
 * link for the same story stops working, so there is one live link at a time.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;

    const allowed = await consumeRateLimit({ scope: "leader-check", key: own.user.id, limit: 30, windowSeconds: 24 * 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "That is a lot of links for one day. Try again tomorrow." }, { status: 429 });

    const admin = createAdminSupabase();
    const now = new Date();
    await admin
      .from("story_checks")
      .update({ revoked_at: now.toISOString() })
      .eq("story_id", own.storyId)
      .eq("user_id", own.user.id)
      .in("status", ["sent", "opened"])
      .is("revoked_at", null);

    const { token, hash } = newCheckToken();
    const { data, error } = await admin
      .from("story_checks")
      .insert({ story_id: own.storyId, user_id: own.user.id, token_hash: hash, expires_at: checkExpiry(now).toISOString() })
      .select(COLUMNS)
      .single();
    if (error || !data) {
      console.error("Leader check create failed:", error?.message);
      return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
    }
    return NextResponse.json({ url: checkUrl(SITE_URL, token), check: educatorView(data as CheckRow, now) });
  } catch (error) {
    console.error("Leader check create error:", error);
    return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
  }
}

/** Cancel a link the leader has not answered yet. It stops opening the story straight away. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;
    const { error } = await createAdminSupabase()
      .from("story_checks")
      .update({ revoked_at: new Date().toISOString() })
      .eq("story_id", own.storyId)
      .eq("user_id", own.user.id)
      .in("status", ["sent", "opened"])
      .is("revoked_at", null);
    if (error) {
      console.error("Leader check cancel failed:", error.message);
      return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
    }
    return NextResponse.json({ check: educatorView(await latestCheck(own.storyId, own.user.id)) });
  } catch (error) {
    console.error("Leader check cancel error:", error);
    return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
  }
}
