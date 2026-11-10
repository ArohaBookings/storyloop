import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { looksLikeFamilyToken } from "@/lib/family-link";
import { hashCheckToken } from "@/lib/story-check-token";
import { openFamilyLink, replyThroughFamilyLink } from "@/lib/family-link-server";

export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const GONE = { error: "This link does not open anything. Ask your child's teacher for a new one." };

/**
 * The family's side of a Family link. Public: the link is the only key, it
 * arrives in the request body (never in the address, so it is never logged),
 * and an unknown, cancelled or ended link gets the same answer as a wrong one.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    if (!looksLikeFamilyToken(token)) return NextResponse.json(GONE, { status: 404, headers: NO_STORE });

    if (body?.action === "reply") {
      const linkKey = hashCheckToken(token).slice(0, 24);
      const [ipOk, linkOk] = await Promise.all([
        consumeRateLimit({ scope: "family-reply-ip", key: ip, limit: 30, windowSeconds: 60 * 60 }),
        consumeRateLimit({ scope: "family-reply-link", key: linkKey, limit: 12, windowSeconds: 24 * 60 * 60 }),
      ]);
      if (!ipOk || !linkOk) return NextResponse.json({ error: "That is a lot of messages for one day. Try again tomorrow." }, { status: 429, headers: NO_STORE });
      const result = await replyThroughFamilyLink(token, { storyId: body?.storyId, text: body?.text });
      if (!result.ok) {
        if (result.reason === "empty") return NextResponse.json({ error: "Write a few words first." }, { status: 400, headers: NO_STORE });
        if (result.reason === "failed") return NextResponse.json({ error: "That did not send. Try again." }, { status: 500, headers: NO_STORE });
        return NextResponse.json(GONE, { status: 404, headers: NO_STORE });
      }
      await recordServerEvent(createAdminSupabase(), { event: "family_reply", userId: result.userId, path: "/family", metadata: { storyId: result.storyId } });
      return NextResponse.json({ view: result.view }, { headers: NO_STORE });
    }

    const allowed = await consumeRateLimit({ scope: "family-open", key: ip, limit: 240, windowSeconds: 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "Too many tries. Wait a little and open the link again." }, { status: 429, headers: NO_STORE });
    const view = await openFamilyLink(token);
    if (!view) return NextResponse.json(GONE, { status: 404, headers: NO_STORE });
    return NextResponse.json({ view }, { headers: NO_STORE });
  } catch (error) {
    console.error("Family link error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: NO_STORE });
  }
}
