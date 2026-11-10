import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { cleanDecision } from "@/lib/story-check";
import { answerLeaderCheck, openLeaderCheck } from "@/lib/story-check-server";

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

const NO_STORE = { "Cache-Control": "no-store" };
const GONE = "This link is not open any more. Ask the educator to send a new one.";

/**
 * The leader's side of a check (lib/story-check.ts). Public on purpose: the
 * leader has no account. The link key arrives in the request body, never in a
 * URL, so it is not written to request logs or analytics. Each visitor is
 * limited, every "no" reads the same, and an answer is recorded once.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const action = body.action === "answer" ? "answer" : "open";

    const allowed = await consumeRateLimit({
      scope: action === "answer" ? "leader-check-answer" : "leader-check-open",
      key: clientIp(request),
      limit: action === "answer" ? 30 : 120,
      windowSeconds: 60 * 60,
    });
    if (!allowed) return NextResponse.json({ error: "Too many tries just now. Give it a few minutes." }, { status: 429, headers: NO_STORE });

    if (action === "open") {
      const view = await openLeaderCheck(token);
      if (!view) return NextResponse.json({ error: GONE }, { status: 404, headers: NO_STORE });
      return NextResponse.json({ view }, { headers: NO_STORE });
    }

    const decision = cleanDecision(body.decision);
    if (!decision) return NextResponse.json({ error: "Choose one of the two buttons." }, { status: 400, headers: NO_STORE });
    const result = await answerLeaderCheck(token, { decision, name: body.name, comment: body.comment });
    if (!result.ok) {
      if (result.reason === "needs_comment") return NextResponse.json({ error: "Say what you would change, so they know what to fix." }, { status: 400, headers: NO_STORE });
      if (result.reason === "failed") return NextResponse.json({ error: "That did not save. Try again." }, { status: 500, headers: NO_STORE });
      return NextResponse.json({ error: "This link has already been answered, or is not open any more." }, { status: 410, headers: NO_STORE });
    }
    return NextResponse.json({ view: result.view }, { headers: NO_STORE });
  } catch (error) {
    console.error("Leader check error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: NO_STORE });
  }
}
