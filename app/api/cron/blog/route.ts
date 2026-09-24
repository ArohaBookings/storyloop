import { NextRequest, NextResponse } from "next/server";
import { writeNextGuide } from "@/lib/ai/blog-writer";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { submitToIndexNow } from "@/lib/indexnow";

// Up to two model calls per run (a rejected draft lets the next topic try).
export const maxDuration = 300;

/**
 * Publishes the next guide from the backlog. Checked daily in vercel.json (a
 * weekly schedule stopped firing after July 2026); MINIMUM_DAYS_BETWEEN_POSTS
 * still limits it to one guide a week.
 *
 * Vercel Cron calls this with GET, so GET is the publishing path; add
 * ?dryRun=1 to check the backlog and gates without publishing. It writes ONE
 * guide per run and refuses if something went out recently, so a double
 * delivery or a manual trigger cannot flood the blog with same-week posts.
 *
 * Quality gates live in the writer: minimum length, no em dashes, topics that
 * need verified official facts are skipped, and a draft citing a law or
 * regulation its verified facts do not support is never published.
 */
const MINIMUM_DAYS_BETWEEN_POSTS = 6;

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function publishNext() {
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

  // Tell Bing and the other IndexNow engines straight away instead of waiting for a recrawl.
  const indexNow = await submitToIndexNow([`/blog/${result.slug}`, "/blog"]);
  return NextResponse.json({ published: true, slug: result.slug, title: result.title, words: result.words, indexNow });
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.nextUrl.searchParams.get("dryRun") === "1") {
    const dry = await writeNextGuide({ dryRun: true });
    return NextResponse.json({ dryRun: dry });
  }
  return publishNext();
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return publishNext();
}
