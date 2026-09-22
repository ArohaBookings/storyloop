import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { buildWallCard, generateWallCode, isWallCode, type ScrubReport } from "@/lib/wall-card";

/**
 * Creating, publishing and revoking wall cards.
 *
 * The rule that matters: a card may only become published when the scrub report
 * STORED WITH IT says it is safe. The client is never asked and never believed,
 * because the client is the one thing an attacker controls, and "safe" here
 * means "cannot identify a child to a stranger in a corridor".
 */

export const dynamic = "force-dynamic";

const MAX_CARDS = 200;

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function requireEducator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "wallCards")) {
    return { error: NextResponse.json({ error: "Wall cards are on paid plans.", feature: "wall-cards" }, { status: 403 }) } as const;
  }
  return { user, supabase } as const;
}

/** Every card the educator has, newest first. */
export async function GET() {
  const auth = await requireEducator();
  if ("error" in auth) return auth.error;

  const { data } = await auth.supabase
    .from("wall_cards")
    .select("id, code, card, scrub_report, status, expires_at, scan_count, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_CARDS);

  return NextResponse.json({ cards: data ?? [] });
}

/** Build a draft card from one of the educator's own stories. */
export async function POST(request: NextRequest) {
  const auth = await requireEducator();
  if ("error" in auth) return auth.error;

  let body: { storyId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const storyId = typeof body.storyId === "string" ? body.storyId : null;
  if (!storyId) return NextResponse.json({ error: "Choose a story first." }, { status: 400 });

  // Through the user's own client, so row level security decides whether this
  // story is theirs. An ownership bug here would put another service's story
  // on a wall.
  const { data: story } = await auth.supabase
    .from("stories")
    .select("id, story_text, outcomes, metadata")
    .eq("id", storyId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: "That story could not be found." }, { status: 404 });

  // EVERY name on the account, not just this story's child: a story often
  // mentions a sibling, a friend at the water trough, or a child who wandered
  // into the moment.
  const { data: children } = await auth.supabase
    .from("child_profiles")
    .select("name")
    .eq("user_id", auth.user.id);

  const metadata = readMetadata(story.metadata);
  const build = buildWallCard({
    storyText: typeof story.story_text === "string" ? story.story_text : "",
    title: typeof metadata.storyTitle === "string" ? metadata.storyTitle : null,
    outcomes: Array.isArray(story.outcomes) ? story.outcomes.filter((o): o is string => typeof o === "string") : [],
    dispositions: Array.isArray(metadata.learningDispositions)
      ? metadata.learningDispositions.filter((d): d is string => typeof d === "string")
      : [],
    knownNames: (children ?? []).map((c) => String(c.name ?? "")).filter(Boolean),
  });

  const admin = createAdminSupabase();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateWallCode();
    const { data, error } = await admin
      .from("wall_cards")
      .insert({
        user_id: auth.user.id,
        code,
        card: build.card,
        scrub_report: build.report,
        source_story_id: story.id,
        status: "draft",
      })
      .select("id, code, card, scrub_report, status, expires_at")
      .single();

    if (!error) return NextResponse.json({ card: data });
    // 23505 is a code collision, which is vanishingly rare but free to retry.
    if ((error as { code?: string }).code !== "23505") {
      console.error("Wall card create failed:", error);
      return NextResponse.json({ error: "Could not build that card." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Could not build that card." }, { status: 500 });
}

/** Publish, revoke or renew one card. */
export async function PATCH(request: NextRequest) {
  const auth = await requireEducator();
  if ("error" in auth) return auth.error;

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : null;
  const action = body.action;
  if (!id || (action !== "publish" && action !== "revoke" && action !== "renew")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: existing } = await auth.supabase
    .from("wall_cards")
    .select("id, code, scrub_report, status")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "That card could not be found." }, { status: 404 });

  if (action === "publish") {
    // The gate. Read from the row, never from the request: a client that could
    // assert its own safety would make every check above decorative.
    const report = (existing.scrub_report ?? {}) as Partial<ScrubReport>;
    if (report.safe !== true) {
      return NextResponse.json(
        { error: "This card still has something to check.", blockers: report.blockers ?? [] },
        { status: 409 },
      );
    }
    if (!isWallCode(existing.code)) {
      return NextResponse.json({ error: "This card's code is invalid." }, { status: 409 });
    }
  }

  const patch =
    action === "publish"
      ? { status: "published" as const, revoked_at: null }
      : action === "revoke"
        ? { status: "revoked" as const, revoked_at: new Date().toISOString() }
        : { expires_at: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString() };

  const { data, error } = await auth.supabase
    .from("wall_cards")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id, code, card, scrub_report, status, expires_at, scan_count")
    .single();

  if (error) {
    console.error("Wall card update failed:", error);
    return NextResponse.json({ error: "Could not update that card." }, { status: 500 });
  }
  return NextResponse.json({ card: data });
}
