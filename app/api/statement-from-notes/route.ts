import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordServerEvent } from "@/lib/analytics/server";
import { StoryWriterUnavailableError } from "@/lib/ai/generate";
import {
  MAX_TRANSITION_NOTES,
  MIN_TRANSITION_NOTES,
  generateTransitionDraft,
  type TransitionFramework,
  type TransitionMode,
} from "@/lib/ai/transition-draft";
import { STATEMENT_FREE_LIMIT, STATEMENT_PAID_LIMIT } from "@/lib/child-statement";
import { cleanFirstName } from "@/lib/statement-from-notes";

// One model call, usually 15-30 s.
export const maxDuration = 60;

const FRAMEWORKS = new Set<TransitionFramework>(["VEYLDF", "EYLF", "QKLG", "TW"]);
const MODES = new Set<TransitionMode>(["transition", "summary"]);

/**
 * A transition statement or end-of-year summary drafted from notes the
 * educator pastes, for a signed-in account (lib/statement-from-notes.ts).
 *
 * Nothing is stored: the notes and the draft go back to the page only. The
 * allowance is the child-page drafter's own (same scopes), so the two doors
 * share one count.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first.", code: "unauthenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_TRANSITION_NOTES) : "";
  const framework = typeof body.framework === "string" && FRAMEWORKS.has(body.framework as TransitionFramework) ? (body.framework as TransitionFramework) : null;
  const mode = typeof body.mode === "string" && MODES.has(body.mode as TransitionMode) ? (body.mode as TransitionMode) : null;
  if (!framework || !mode) return NextResponse.json({ error: "Choose the curriculum and what to draft.", code: "invalid" }, { status: 400 });
  if (notes.length < MIN_TRANSITION_NOTES) {
    return NextResponse.json(
      { error: "Add a little more: two or three moments you saw this year, a few lines each.", code: "too_short" },
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
    const draft = await generateTransitionDraft({ notes, childName: cleanFirstName(body.childName), framework, mode });
    // Counts only: never the notes, the draft or the child's name.
    try {
      await recordServerEvent(createAdminSupabase(), {
        event: "statement_created",
        userId: user.id,
        path: "/api/statement-from-notes",
        metadata: {
          framework,
          mode,
          paid,
          noteWords: notes.split(/\s+/).length,
          filled: draft.outcomes.filter((o) => o.seen).length,
          basicDraft: Boolean(draft.aiUnavailable),
        },
      });
    } catch {
      /* the count is a nicety; the draft is the point */
    }
    return NextResponse.json({ draft, paid });
  } catch (error) {
    if (error instanceof StoryWriterUnavailableError) {
      return NextResponse.json({ error: "The writer is busy. Try again in a few minutes.", code: "unavailable" }, { status: 503 });
    }
    console.error("Statement from notes failed:", error);
    return NextResponse.json({ error: "Something went wrong. Try again in a minute.", code: "failed" }, { status: 500 });
  }
}
