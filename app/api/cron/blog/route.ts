import { NextRequest, NextResponse } from "next/server";
import { writeNextGuide } from "@/lib/ai/blog-writer";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { recentlyChanged, submitToIndexNow } from "@/lib/indexnow";
import sitemap from "@/app/sitemap";
import { currentBlogTarget } from "@/lib/business-manager";
import { BLOG_WEEK_WINDOW_DAYS, blogHoldReason } from "@/lib/blog-pace";

// Up to two model calls per run (a rejected draft lets the next topic try).
export const maxDuration = 300;

/**
 * Publishes the next guide from the backlog. Checked daily in vercel.json (a
 * weekly schedule stopped firing after July 2026). The pace comes from the
 * weekly business report (lib/business-manager.ts, Leo 3 Nov 2026: "1 to 2 blog
 * posts a week just to keep Google SEO active"): two guides a week, at least
 * three days apart, while search is behind its 8% target; one a week, six days
 * apart, when on target or before the first report.
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
function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function publishNext() {
  const admin = createAdminSupabase();
  const perWeek = await currentBlogTarget();
  // The gaps carry a quarter of a day of slack, so a once-a-day run does not
  // miss its day by seconds (lib/blog-pace.ts).
  const { count: publishedInWindow } = await admin
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("published", true)
    .gte("published_at", new Date(Date.now() - BLOG_WEEK_WINDOW_DAYS * 86_400_000).toISOString());
  const { data: latest } = await admin
    .from("blog_posts")
    .select("published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hold = blogHoldReason({
    perWeek,
    publishedInWindow: publishedInWindow ?? 0,
    daysSinceLatest: latest?.published_at ? (Date.now() - new Date(latest.published_at).getTime()) / 86_400_000 : null,
  });
  if (hold) return NextResponse.json({ skipped: true, reason: hold });

  const result = await writeNextGuide();
  if (!result.ok) {
    console.error("Auto blog write failed:", result.reason);
    return NextResponse.json({ published: false, reason: result.reason }, { status: 200 });
  }

  // Tell Bing and the other IndexNow engines straight away instead of waiting for a recrawl.
  const indexNow = await submitToIndexNow([`/blog/${result.slug}`, "/blog"]);
  return NextResponse.json({ published: true, slug: result.slug, title: result.title, words: result.words, indexNow });
}

/**
 * Set and forget (20 Oct 2026): every daily run also tells Bing about pages
 * whose reviewed date changed in the last two days, so edits shipped in a
 * deploy are submitted without a manual IndexNow ping. Never blocks publishing.
 */
async function submitChangedPages() {
  try {
    const urls = recentlyChanged(await sitemap());
    if (!urls.length) return { submitted: 0, status: null, skipped: "nothing_changed" };
    return await submitToIndexNow(urls);
  } catch (error) {
    console.error("Changed-page IndexNow check failed (publishing unaffected):", error);
    return { submitted: 0, status: null, skipped: "error" };
  }
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.nextUrl.searchParams.get("dryRun") === "1") {
    const dry = await writeNextGuide({ dryRun: true });
    return NextResponse.json({ dryRun: dry, changedPages: recentlyChanged(await sitemap().catch(() => [])) });
  }
  const response = await publishNext();
  const changedPages = await submitChangedPages();
  const body = await response.json().catch(() => ({}));
  return NextResponse.json({ ...body, changedPages }, { status: response.status });
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return publishNext();
}
