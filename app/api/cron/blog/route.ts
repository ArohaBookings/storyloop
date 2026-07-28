import { NextRequest, NextResponse } from "next/server";
import { writeNextGuide } from "@/lib/ai/blog-writer";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const maxDuration = 120;

/**
 * Publishes the next guide from the backlog.
 *
 * Intended to run on a schedule roughly every fortnight. It writes ONE guide
 * per invocation and refuses to publish if something has already gone out
 * recently, so a misconfigured schedule or a double delivery cannot flood the
 * blog with same-day posts.
 */
const MINIMUM_DAYS_BETWEEN_POSTS = 10;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: latest } = await admin
    .from("blog_posts")
    .select("published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.published_at) {
    const daysSince = (Date.now() - new Date(latest.published_at).getTime()) / 86_400_000;
    if (daysSince < MINIMUM_DAYS_BETWEEN_POSTS) {
      return NextResponse.json({
        skipped: true,
        reason: `last post was ${daysSince.toFixed(1)} days ago, minimum is ${MINIMUM_DAYS_BETWEEN_POSTS}`,
      });
    }
  }

  const result = await writeNextGuide();
  if (!result.ok) {
    console.error("Auto blog write failed:", result.reason);
    return NextResponse.json({ published: false, reason: result.reason }, { status: 200 });
  }

  return NextResponse.json({ published: true, slug: result.slug, title: result.title, words: result.words });
}

/** Lets the admin see the backlog state without writing anything. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = await writeNextGuide({ dryRun: true });
  return NextResponse.json({ dryRun: dry });
}
