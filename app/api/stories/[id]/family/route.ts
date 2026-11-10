import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { familyStateForStory, markFamilyRepliesSeen, shareStoryWithFamily, unshareStory } from "@/lib/family-link-server";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Whether this story is shared with its child's family, the family's links, and what they wrote back. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id } = await context.params;
    const state = await familyStateForStory(user.id, id);
    if (!state) return NextResponse.json({ error: "Story not found." }, { status: 404 });
    return NextResponse.json(state);
  } catch (error) {
    console.error("Family state error:", error);
    return NextResponse.json({ error: "Could not load that." }, { status: 500 });
  }
}

/**
 * Share this story with its child's family (the educator's own decision, one
 * story at a time), or mark the family's replies as read. Sharing prepares a
 * translation for each language the family's links ask for, on plans that
 * include translation; a translation that fails its checks is simply not shown.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (body?.action === "seen") {
      await markFamilyRepliesSeen(user.id, id);
      return NextResponse.json({ ok: true });
    }

    const allowed = await consumeRateLimit({ scope: "family-share", key: user.id, limit: 120, windowSeconds: 24 * 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "That is a lot of sharing for one day. Try again tomorrow." }, { status: 429 });

    const result = await shareStoryWithFamily(user.id, id, typeof body?.childId === "string" ? body.childId : undefined);
    if (!result) return NextResponse.json({ error: "Story not found." }, { status: 404 });
    if ("needsChild" in result) {
      return NextResponse.json({ error: "Add this child under Children first, or put their first name on the story, then share it.", needsChild: true }, { status: 400 });
    }
    if ("failed" in result) return NextResponse.json({ error: "Could not share that. Try again." }, { status: 500 });
    const state = await familyStateForStory(user.id, id);
    return NextResponse.json({ ...state, translated: result.translated });
  } catch (error) {
    console.error("Family share error:", error);
    return NextResponse.json({ error: "Could not share that. Try again." }, { status: 500 });
  }
}

/** Stop sharing this story. It disappears from every family link straight away. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id } = await context.params;
    if (!(await unshareStory(user.id, id))) return NextResponse.json({ error: "Could not stop sharing. Try again." }, { status: 500 });
    const state = await familyStateForStory(user.id, id);
    if (!state) return NextResponse.json({ error: "Story not found." }, { status: 404 });
    return NextResponse.json(state);
  } catch (error) {
    console.error("Family unshare error:", error);
    return NextResponse.json({ error: "Could not stop sharing. Try again." }, { status: 500 });
  }
}
