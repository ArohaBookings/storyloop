import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { StoryWriterUnavailableError } from "@/lib/ai/generate";
import { generateTransitionDraft, type TransitionFramework, type TransitionMode } from "@/lib/ai/transition-draft";
import {
  STATEMENT_FREE_LIMIT,
  STATEMENT_MIN_STORIES,
  STATEMENT_PAID_LIMIT,
  STATEMENT_STORY_LIMIT,
  enoughNotes,
  notesFromStories,
} from "@/lib/child-statement";

// One model call, usually 15-30 s.
export const maxDuration = 60;

const FRAMEWORKS = new Set<TransitionFramework>(["VEYLDF", "EYLF", "QKLG", "TW"]);
const MODES = new Set<TransitionMode>(["transition", "summary"]);

/**
 * A child's transition statement or end-of-year summary, drafted from the
 * observations the educator already saved about them (lib/child-statement.ts).
 * Nothing new is stored: the draft goes back to the page to check and copy.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first.", code: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { framework?: unknown; mode?: unknown };
  const framework = typeof body.framework === "string" && FRAMEWORKS.has(body.framework as TransitionFramework) ? (body.framework as TransitionFramework) : null;
  const mode = typeof body.mode === "string" && MODES.has(body.mode as TransitionMode) ? (body.mode as TransitionMode) : null;
  if (!framework || !mode) return NextResponse.json({ error: "Choose the curriculum and what to draft.", code: "invalid" }, { status: 400 });

  // Row level security also limits both reads to the educator's own records.
  const { data: child } = await supabase.from("child_profiles").select("id, name").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!child) return NextResponse.json({ error: "That child profile was not found.", code: "not_found" }, { status: 404 });

  const { data: rows } = await supabase
    .from("stories")
    .select("created_at, observations")
    .eq("user_id", user.id)
    .eq("child_id", child.id)
    .order("created_at", { ascending: false })
    .limit(STATEMENT_STORY_LIMIT);
  const stories = (rows ?? []).map((row) => ({ date: String(row.created_at).slice(0, 10), observations: (row.observations as string | null) ?? null }));
  const { notes, used } = notesFromStories(stories);
  if (used < STATEMENT_MIN_STORIES || !enoughNotes(notes)) {
    return NextResponse.json(
      { error: `Save at least ${STATEMENT_MIN_STORIES} stories about ${child.name} first. The draft is built only from what you have written down.`, code: "need_more_stories" },
      { status: 400 },
    );
  }

  const profile = await getAccessProfile(user);
  const paid = hasFeatureAccess(profile.plan, "transitionPack");
  const allowed = await consumeRateLimit(
    paid
      ? { scope: "child-statement", key: user.id, limit: STATEMENT_PAID_LIMIT, windowSeconds: 86_400 }
      : { scope: "child-statement-free", key: user.id, limit: STATEMENT_FREE_LIMIT, windowSeconds: 30 * 86_400 },
  );
  if (!allowed) {
    return NextResponse.json(
      paid
        ? { error: "That is a lot of drafts for one day. Try again tomorrow.", code: "rate_limited" }
        : { error: `The free plan includes ${STATEMENT_FREE_LIMIT} of these a month. Educator includes as many as you need.`, code: "free_limit" },
      { status: 429 },
    );
  }

  try {
    const draft = await generateTransitionDraft({ notes, childName: child.name as string, framework, mode });
    return NextResponse.json({ draft, storiesUsed: used, paid });
  } catch (error) {
    if (error instanceof StoryWriterUnavailableError) {
      return NextResponse.json({ error: "The writer is busy. Try again in a few minutes.", code: "unavailable" }, { status: 503 });
    }
    console.error("Child statement failed:", error);
    return NextResponse.json({ error: "Something went wrong. Try again in a minute.", code: "failed" }, { status: 500 });
  }
}
