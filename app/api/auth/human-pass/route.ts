import { NextRequest, NextResponse } from "next/server";
import { issuePass } from "@/lib/auth/human-pass";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** A signed pass for the quiet check on signup (lib/auth/human-pass.ts). */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const allowed = await consumeRateLimit({ scope: "human-pass", key: ip, limit: 60, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  return NextResponse.json(issuePass(), { headers: { "Cache-Control": "no-store" } });
}
