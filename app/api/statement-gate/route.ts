import type { NextRequest } from "next/server";
import { POST as draftFromNotes } from "@/app/api/statement-from-notes/route";
import { MAX_TRANSITION_NOTES, MIN_TRANSITION_NOTES } from "@/lib/ai/transition-draft";
import { gateStatement } from "@/lib/statement-gate-server";

// The protected route's own limit: one model call, usually 15-30 s.
export const maxDuration = 60;

const FRAMEWORKS = new Set(["VEYLDF", "EYLF", "QKLG", "TW"]);
const MODES = new Set(["transition", "summary"]);

/**
 * /api/statement-from-notes arrives here (next.config.ts rewrites, only while
 * STATEMENTS_PAY_TODAY is on). The protected handler does all the work; see
 * lib/statement-gate-server.ts.
 */
export async function POST(request: NextRequest) {
  return gateStatement(request, draftFromNotes, async ({ body }) => {
    // The protected route's checks before its counter, in its order.
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, MAX_TRANSITION_NOTES) : "";
    if (typeof body.framework !== "string" || !FRAMEWORKS.has(body.framework)) return false;
    if (typeof body.mode !== "string" || !MODES.has(body.mode)) return false;
    return notes.length >= MIN_TRANSITION_NOTES;
  });
}
