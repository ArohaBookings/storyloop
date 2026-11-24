import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { cleanDecision } from "@/lib/story-check";
import { answerLeaderCheck, coverLeaderCheck, openLeaderCheck } from "@/lib/story-check-server";
import { answerSetAll, answerSetItem } from "@/lib/leader-sets-server";

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
    // cover (25 Nov 2026): who sent it, read before the tap and never counted as an open.
    // answer_item and answer_all: a whole room's set (lib/leader-sets.ts).
    const action = ["answer", "answer_item", "answer_all", "cover"].includes(body.action) ? (body.action as string) : "open";
    const answering = action.startsWith("answer");

    const allowed = await consumeRateLimit({
      scope: answering ? "leader-check-answer" : "leader-check-open",
      key: clientIp(request),
      limit: answering ? 60 : 120,
      windowSeconds: 60 * 60,
    });
    if (!allowed) return NextResponse.json({ error: "Too many tries just now. Give it a few minutes." }, { status: 429, headers: NO_STORE });

    if (action === "cover") {
      const cover = await coverLeaderCheck(token);
      if (!cover) return NextResponse.json({ error: GONE }, { status: 404, headers: NO_STORE });
      return NextResponse.json({ cover }, { headers: NO_STORE });
    }

    if (action === "answer_all") {
      const result = await answerSetAll(token, { name: body.name });
      if (!result.ok) return NextResponse.json({ error: result.reason === "failed" ? "That did not save. Try again." : "This link is not open for answers any more." }, { status: result.reason === "failed" ? 500 : 410, headers: NO_STORE });
      return NextResponse.json({ view: result.view, answered: result.answered }, { headers: NO_STORE });
    }

    if (action === "open") {
      const view = await openLeaderCheck(token);
      if (!view) return NextResponse.json({ error: GONE }, { status: 404, headers: NO_STORE });
      return NextResponse.json({ view }, { headers: NO_STORE });
    }

    const decision = cleanDecision(body.decision);
    if (!decision) return NextResponse.json({ error: "Choose one of the two buttons." }, { status: 400, headers: NO_STORE });
    if (action === "answer_item") {
      const result = await answerSetItem(token, { position: body.position, decision, name: body.name, comment: body.comment });
      if (!result.ok) {
        if (result.reason === "needs_comment") return NextResponse.json({ error: "Say what you would change, so they know what to fix." }, { status: 400, headers: NO_STORE });
        if (result.reason === "failed") return NextResponse.json({ error: "That did not save. Try again." }, { status: 500, headers: NO_STORE });
        return NextResponse.json({ error: "This link is not open for answers any more." }, { status: 410, headers: NO_STORE });
      }
      return NextResponse.json({ view: result.view, answered: result.answered }, { headers: NO_STORE });
    }
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
