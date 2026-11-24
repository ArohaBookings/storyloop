import { NextRequest, NextResponse } from "next/server";
import { verifyStopToken } from "@/lib/leader-email";
import { stopLeaderEmails } from "@/lib/email/leader-check";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Stops leader emails to one address, for ever (25 Nov 2026, A2). POST only:
 * the button on /stop (a form) and the List-Unsubscribe one-click header
 * (token in the query, body "List-Unsubscribe=One-Click"). Never on GET.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await consumeRateLimit({ scope: "leader-stop", key: ip, limit: 30, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "Too many tries. Try again soon." }, { status: 429 });
  }
  let token = request.nextUrl.searchParams.get("t") ?? "";
  const type = request.headers.get("content-type") ?? "";
  if (!token && (type.includes("form") || type.includes("text"))) {
    const form = await request.formData().catch(() => null);
    const value = form?.get("t");
    token = typeof value === "string" ? value : "";
  }
  const address = verifyStopToken(token);
  if (!address) return NextResponse.json({ error: "This link does not work." }, { status: 400 });
  await stopLeaderEmails(address);
  // The one-click header expects a plain 200; the form goes back to the page.
  if (request.nextUrl.searchParams.get("t")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL(`/stop?done=1`, request.url), 303);
}
