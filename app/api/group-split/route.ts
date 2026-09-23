import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { childNote, splitGroupNote } from "@/lib/ai/group-split";

export const maxDuration = 60;

/**
 * Split a group note by child. Writes nothing and saves nothing: it returns
 * the parts of the note about each child, copied word for word, for the
 * educator to check before any story is written. See lib/ai/group-split.ts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to split a group note" }, { status: 401 });
  if (!(await consumeRateLimit({ scope: "group-split", key: user.id, limit: 30, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "That is a lot of group notes in an hour. Try again shortly." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const names = Array.isArray(body.names) ? body.names.filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0 && name.length <= 40) : [];
  if (note.split(/\s+/).length < 6) return NextResponse.json({ error: "Write a little more about the moment first." }, { status: 400 });
  if (names.length < 2) return NextResponse.json({ error: "Choose at least two children." }, { status: 400 });
  if (names.length > 8) return NextResponse.json({ error: "Up to eight children at a time." }, { status: 400 });
  const split = await splitGroupNote(note, names);
  // Each child's part, as whole sentences of the note, ready to review.
  const notes = Object.fromEntries(split.children.map((child) => [child.name, childNote(note, split, child.name)]));
  return NextResponse.json({ ...split, notes });
}
