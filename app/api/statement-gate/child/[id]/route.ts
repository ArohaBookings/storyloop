import type { NextRequest } from "next/server";
import { POST as childStatement } from "@/app/api/children/[id]/statement/route";
import { STATEMENT_MIN_STORIES, STATEMENT_STORY_LIMIT, enoughNotes, notesFromStories } from "@/lib/child-statement";
import { gateStatement } from "@/lib/statement-gate-server";

// The protected route's own limit: one model call, usually 15-30 s.
export const maxDuration = 60;

const FRAMEWORKS = new Set(["VEYLDF", "EYLF", "QKLG", "TW"]);
const MODES = new Set(["transition", "summary"]);

/**
 * /api/children/:id/statement arrives here (next.config.ts rewrites, only
 * while STATEMENTS_PAY_TODAY is on). The protected handler does all the work;
 * see lib/statement-gate-server.ts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return gateStatement(
    request,
    (untouched) => childStatement(untouched, { params: Promise.resolve({ id }) }),
    async ({ user, body, supabase }) => {
      // The protected route's checks before its counter, in its order (read only).
      if (typeof body.framework !== "string" || !FRAMEWORKS.has(body.framework)) return false;
      if (typeof body.mode !== "string" || !MODES.has(body.mode)) return false;
      const { data: child } = await supabase.from("child_profiles").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (!child) return false;
      const { data: rows } = await supabase
        .from("stories")
        .select("created_at, observations")
        .eq("user_id", user.id)
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(STATEMENT_STORY_LIMIT);
      const stories = (rows ?? []).map((row) => ({ date: String(row.created_at).slice(0, 10), observations: (row.observations as string | null) ?? null }));
      const { notes, used } = notesFromStories(stories);
      return used >= STATEMENT_MIN_STORIES && enoughNotes(notes);
    },
  );
}
