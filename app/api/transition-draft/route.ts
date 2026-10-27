import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { StoryWriterUnavailableError } from "@/lib/ai/generate";
import {
  MAX_TRANSITION_NOTES,
  MIN_TRANSITION_NOTES,
  generateTransitionDraft,
  type TransitionFramework,
  type TransitionMode,
} from "@/lib/ai/transition-draft";

// One model call, usually 15-30 s.
export const maxDuration = 60;

/**
 * The no-signup transition statement / end-of-year summary demo on the TLDS,
 * transition and end-of-year guides (lib/ai/transition-draft.ts explains why).
 *
 * Nothing is stored: the notes and the draft go back to the browser only. It
 * has its own allowance, separate from the learning-story demo, so trying one
 * never uses up the other.
 */
function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

const FRAMEWORKS = new Set<TransitionFramework>(["VEYLDF", "EYLF", "QKLG", "TW"]);
// Spend ceiling for this public endpoint across everyone, per day. Real use is
// a handful a day; this only bites if something goes wrong.
const DAILY_LIMIT = 200;

/**
 * Only this site's own page may call it from a browser. Another site could
 * otherwise make each of its visitors' browsers spend AI calls here (a
 * text/plain POST needs no CORS preflight). Requests with no browser headers
 * (tests, curl) carry no such risk and are still rate limited.
 */
function crossSite(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  if (crossSite(request)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  // JSON only: a JSON body from another site needs a CORS preflight, which fails.
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Something went wrong reading your notes. Try again." }, { status: 415 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Something went wrong reading your notes. Try again." }, { status: 400 });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_TRANSITION_NOTES) : "";
  if (notes.length < MIN_TRANSITION_NOTES) {
    return NextResponse.json(
      { error: "Add a little more: two or three moments you saw this year, a few lines each.", code: "too_short" },
      { status: 400 },
    );
  }
  const framework: TransitionFramework = FRAMEWORKS.has(body.framework as TransitionFramework) ? (body.framework as TransitionFramework) : "VEYLDF";
  const mode: TransitionMode = body.mode === "summary" ? "summary" : "transition";
  // A first name only. When none is given the writer takes the first name
  // from the notes, and is told never to use a surname.
  const childName = typeof body.childName === "string" ? body.childName.trim().split(/\s+/)[0]?.slice(0, 30) ?? "" : "";

  const allowed = await consumeRateLimit({ scope: "public-transition-demo", key: clientIp(request), limit: 3, windowSeconds: 60 * 60 });
  if (!allowed) {
    return NextResponse.json({ error: "That's the free limit for this hour. Try again in an hour.", code: "limit" }, { status: 429 });
  }
  const underDailyCeiling = await consumeRateLimit({ scope: "public-transition-demo-global", key: "all", limit: DAILY_LIMIT, windowSeconds: 24 * 60 * 60 });
  if (!underDailyCeiling) {
    return NextResponse.json({ error: "The free drafts are busy today. Try again tomorrow.", code: "daily_limit" }, { status: 429 });
  }

  try {
    const draft = await generateTransitionDraft({ notes, childName, framework, mode });
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof StoryWriterUnavailableError) {
      return NextResponse.json({ error: "The writer is busy right now. Try again in a minute.", code: "unavailable" }, { status: 503 });
    }
    console.error("transition-draft failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again in a minute.", code: "error" }, { status: 500 });
  }
}
