import { NextRequest, NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/indexnow";

/**
 * Submits every URL in the sitemap to IndexNow once. Deliberately not
 * scheduled: IndexNow asks for changed URLs, not the same list over and over.
 * Run it once after a deploy that adds pages. New guides are submitted
 * automatically when the blog job publishes them.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await sitemap();
  const result = await submitToIndexNow(entries.map((entry) => entry.url));
  return NextResponse.json({ urls: entries.length, ...result });
}
