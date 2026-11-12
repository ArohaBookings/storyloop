import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/email/config";
import { checkExpiry, checkUrl, cleanCentreName, educatorView, type CheckRow } from "@/lib/story-check";
import { hashOfferRef, newCheckToken, offerRefFor } from "@/lib/story-check-token";
import { CHECK_COLUMNS, endStoryLinks } from "@/lib/story-check-server";

type RouteContext = { params: Promise<{ id: string }> };

const COLUMNS = CHECK_COLUMNS;

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
 * link for the same story stops working, so there is one live link at a time,
 * and no earlier link for the story keeps a centre offer.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;
    // Both optional (13 Nov 2026): the centre's name, and whether the leader may
    // see a few numbers about this educator's own recent stories. A request with
    // no body at all is a link with neither, exactly as before.
    const body = await request.json().catch(() => ({}));
    const centreName = cleanCentreName(body?.centreName) || null;
    const shareCounts = body?.shareCounts === true;

    const allowed = await consumeRateLimit({ scope: "leader-check", key: own.user.id, limit: 30, windowSeconds: 24 * 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "That is a lot of links for one day. Try again tomorrow." }, { status: 429 });

    const admin = createAdminSupabase();
    const now = new Date();
    // One live link at a time, and every earlier link's centre offer ends here.
    await endStoryLinks(own.storyId, own.user.id, "replace", now);

    const { token, hash } = newCheckToken();
    const { data, error } = await admin
      .from("story_checks")
      .insert({
        story_id: own.storyId,
        user_id: own.user.id,
        token_hash: hash,
        expires_at: checkExpiry(now).toISOString(),
        centre_name: centreName,
        share_counts: shareCounts,
        // Not the link key and opens nothing; see lib/story-check-token.ts offerRefFor.
        offer_ref_hash: hashOfferRef(offerRefFor(token)),
      })
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

/**
 * Cancel the link, answered or not. It stops opening the story straight away,
 * and the centre offer it carried ends with it, claimed or not
 * (lib/story-check-server.ts endStoryLinks).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;
    const { ok } = await endStoryLinks(own.storyId, own.user.id, "cancel");
    if (!ok) return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
    return NextResponse.json({ check: educatorView(await latestCheck(own.storyId, own.user.id)) });
  } catch (error) {
    console.error("Leader check cancel error:", error);
    return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
  }
}
