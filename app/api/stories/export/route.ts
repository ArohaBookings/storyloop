import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import {
  EXPORT_CONTENT_TYPE,
  exportFileName,
  exportFormat,
  storiesToCsv,
  storiesToText,
  zoneForLocation,
  type ExportStory,
} from "@/lib/story-export";

export const dynamic = "force-dynamic";

const PAGE = 1000;
const NO_STORE = { "Cache-Control": "no-store, private" };

/**
 * GET /api/stories/export?format=txt|csv: every story this account has saved,
 * in one file (lib/story-export.ts has the formats). History's "Download
 * everything" links here.
 *
 * Whose stories: the caller's own, twice over. The query runs as the signed-in
 * user, so row level security applies, AND it filters on user_id = the
 * caller, because a centre leader's session can read the team's stories under
 * RLS and this file is meant to be "what I wrote", never the team's.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first.", code: "unauthenticated" }, { status: 401, headers: NO_STORE });

  const format = exportFormat(request.nextUrl.searchParams.get("format"));
  if (!format) return NextResponse.json({ error: "Choose txt or csv.", code: "invalid" }, { status: 400, headers: NO_STORE });

  // Generous for a person, a wall for a script: 10 files an hour.
  const allowed = await consumeRateLimit({ scope: "story-export", key: user.id, limit: 10, windowSeconds: 3_600 });
  if (!allowed) {
    return NextResponse.json(
      { error: "That is a lot of downloads in an hour. Try again a little later.", code: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": "3600" } },
    );
  }

  const stories: ExportStory[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("stories")
      .select("created_at, child_name, age_group, observations, story_text, outcomes, next_steps, location")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Story export failed:", error.message);
      return NextResponse.json({ error: "Something went wrong. Try again in a minute.", code: "failed" }, { status: 500, headers: NO_STORE });
    }
    stories.push(...((data ?? []) as ExportStory[]));
    if (!data || data.length < PAGE) break;
  }

  if (stories.length === 0) {
    return NextResponse.json(
      { error: "You have no saved stories yet, so there is nothing to download.", code: "empty" },
      { status: 404, headers: NO_STORE },
    );
  }

  const zone = zoneForLocation(stories[0].location);
  const now = new Date();
  const body = format === "csv" ? storiesToCsv(stories) : storiesToText(stories, now, zone);

  // A count, never a story, a note or a name.
  try {
    await recordServerEvent(createAdminSupabase(), {
      event: "stories_downloaded",
      userId: user.id,
      path: "/api/stories/export",
      metadata: { format, stories: stories.length },
    });
  } catch {
    /* the count is a nicety; the file is the point */
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      ...NO_STORE,
      "Content-Type": EXPORT_CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="${exportFileName(format, now, zone)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
