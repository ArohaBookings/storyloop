import { LEADER_SOURCES_ON } from "@/lib/build-switches";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/email/config";
import { checkExpiry, checkUrl, cleanCentreName, educatorView, leaderView, type CheckRow } from "@/lib/story-check";
import { emailLeaderIfAsked } from "@/lib/leader-send-server";
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

/**
 * Where this story's check stands: waiting, opened, or what the leader said.
 * With ?preview=1 (25 Nov 2026, A1): exactly the page her leader will get,
 * built by the same leaderView from the saved story, before any link exists.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const own = await ownStory(context);
    if ("error" in own) return own.error;
    if (request.nextUrl.searchParams.get("preview") === "1") {
      const admin = createAdminSupabase();
      const [{ data: story }, { data: profile }] = await Promise.all([
        admin.from("stories").select("child_name, observations, story_text, outcomes, next_steps, created_at").eq("id", own.storyId).eq("user_id", own.user.id).maybeSingle(),
        admin.from("profiles").select("full_name").eq("id", own.user.id).maybeSingle(),
      ]);
      if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
      const now = new Date();
      const check: CheckRow = {
        id: "preview", story_id: own.storyId, user_id: own.user.id, status: "opened", leader_name: null, comment: null,
        created_at: now.toISOString(), opened_at: now.toISOString(), decided_at: null, expires_at: checkExpiry(now).toISOString(), revoked_at: null,
        centre_name: cleanCentreName(request.nextUrl.searchParams.get("centre") ?? "") || null, share_counts: false,
        join_consent: request.nextUrl.searchParams.get("join") === "1",
      };
      const view = leaderView({ story, check, educatorName: profile?.full_name ?? null, now, offer: null });
      return NextResponse.json({ view: { ...view, offer: null } }, { headers: { "Cache-Control": "no-store" } });
    }
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
    // 25 Nov 2026: "If my leader starts our centre on StoryLoop, add me to the team" (on by default in the panel).
    const joinConsent = body?.joinConsent === true;
    // 25 Nov 2026 (A4): she ticked "Show my leader where each line came from" in the preview.
    const showSources = LEADER_SOURCES_ON && body?.showSources === true;

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
        join_consent: joinConsent,
        ...(showSources ? { show_sources: true } : {}),
        // Not the link key and opens nothing; see lib/story-check-token.ts offerRefFor.
        offer_ref_hash: hashOfferRef(offerRefFor(token)),
      })
      .select(COLUMNS)
      .single();
    if (error || !data) {
      console.error("Leader check create failed:", error?.message);
      return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
    }
    // StoryLoop emails the leader when she asked it to (A2); the link is returned either way.
    const email = await emailLeaderIfAsked({
      userId: own.user.id, body: (body ?? {}) as Record<string, unknown>, kind: "story", checkId: (data as CheckRow).id, token,
      centreName: centreName ?? "", pieces: 1, expiresAt: (data as CheckRow).expires_at,
    });
    return NextResponse.json({ url: checkUrl(SITE_URL, token), check: educatorView(data as CheckRow, now), email });
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
