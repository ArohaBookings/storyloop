import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recordServerEvent } from "@/lib/analytics/server";
import { checkInputProblem, checkMyStory } from "@/lib/check-my-story";

const NO_STORE = { "Cache-Control": "no-store" };

/** A visitor's checks an hour, and everybody's in a day, like the public demos (app/api/generate, app/api/transition-draft). */
const PER_HOUR = 20;
const ALL_PER_DAY = 3000;

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Check my story for anyone, signed in or not (/check-my-story).
 *
 * Deterministic (lib/check-my-story.ts): no model is called, so a check costs
 * nothing but a little server time. Still rate limited like the public demos,
 * so nobody can use it as a free endpoint. Nothing pasted is stored or logged:
 * the story and the note live only for the length of this request. The one
 * thing kept is a count, the analytics row "check_my_story" with how many
 * things were worth a look.
 */
export async function POST(request: NextRequest) {
  try {
    // Another site may not make its visitors' browsers run it.
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
    }
    const body = await request.json().catch(() => ({}));
    const problem = checkInputProblem(body?.story, body?.note);
    if (problem) return NextResponse.json({ error: problem }, { status: 400, headers: NO_STORE });

    const allowed = await consumeRateLimit({ scope: "public-check-my-story", key: clientIp(request), limit: PER_HOUR, windowSeconds: 60 * 60 });
    if (!allowed) {
      return NextResponse.json({ error: "That is a lot of checks for one hour. Try again a little later." }, { status: 429, headers: NO_STORE });
    }
    const underCeiling = await consumeRateLimit({ scope: "public-check-my-story-global", key: "all", limit: ALL_PER_DAY, windowSeconds: 24 * 60 * 60 });
    if (!underCeiling) {
      return NextResponse.json({ error: "The checker is busy today. Try again tomorrow." }, { status: 429, headers: NO_STORE });
    }

    const check = checkMyStory({ story: body.story as string, note: body.note as string });
    await recordServerEvent(createAdminSupabase(), { event: "check_my_story", path: "/check-my-story", metadata: { looks: check.looks } });
    return NextResponse.json({ check }, { headers: NO_STORE });
  } catch {
    // Never the request body in a log: it is someone's story about a child.
    console.error("Check my story failed");
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: NO_STORE });
  }
}
