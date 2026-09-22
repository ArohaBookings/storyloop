import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { checkChildWords, decideProvenance, MAX_ABOUT_LENGTH, normalizeChildWords } from "@/lib/child-voice";

/**
 * Saving, listing and deleting what a child said about their own work.
 *
 * Two rules run through all of it:
 *
 *   1. The words are never touched. They are not spell-checked, not tidied
 *      into adult grammar and never passed through a model on the way in. The
 *      only thing stripped is invisible characters.
 *
 *   2. Nothing is stored for a child whose family has not agreed. This route
 *      checks, and the database refuses independently, because consent for
 *      recording a three-year-old is not a rule to leave to one code path.
 */

export const dynamic = "force-dynamic";

async function requireAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "childVoice")) {
    return { error: NextResponse.json({ error: "Children's own words is on paid plans.", feature: "child-voice" }, { status: 403 }) } as const;
  }
  return { user, supabase } as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireAccess();
  if ("error" in auth) return auth.error;

  const childId = request.nextUrl.searchParams.get("childId");
  let query = auth.supabase
    .from("child_voice_notes")
    .select("id, child_id, words, about, provenance, said_at")
    .eq("user_id", auth.user.id)
    .order("said_at", { ascending: false })
    .limit(200);
  if (childId) query = query.eq("child_id", childId);

  const { data } = await query;
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAccess();
  if ("error" in auth) return auth.error;

  let body: { childId?: unknown; words?: unknown; draft?: unknown; about?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const childId = typeof body.childId === "string" ? body.childId : null;
  if (!childId) return NextResponse.json({ error: "Choose a child first." }, { status: 400 });

  const checked = checkChildWords(body.words);
  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });

  // Consent is checked here so the educator gets a sentence they can act on,
  // and again by the database so it holds regardless of this file.
  const { data: child } = await auth.supabase
    .from("child_profiles")
    .select("id, name, voice_consent_at")
    .eq("id", childId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: "That child could not be found." }, { status: 404 });
  if (!child.voice_consent_at) {
    return NextResponse.json(
      { error: `Record ${child.name}'s family consent before saving anything they said.`, needsConsent: true },
      { status: 409 },
    );
  }

  const about = normalizeChildWords(body.about).slice(0, MAX_ABOUT_LENGTH) || null;
  // Worked out from the text rather than taken on trust, so the record cannot
  // flatter the machine that produced the draft.
  const provenance = decideProvenance({
    draft: typeof body.draft === "string" ? body.draft : null,
    saved: checked.words,
  });

  const { data, error } = await auth.supabase
    .from("child_voice_notes")
    .insert({ user_id: auth.user.id, child_id: childId, words: checked.words, about, provenance })
    .select("id, child_id, words, about, provenance, said_at")
    .single();

  if (error) {
    console.error("Saving a child's words failed:", error);
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
  return NextResponse.json({ note: data });
}

/**
 * Deleting one. Reachable from the child's own screen on purpose: a child who
 * says "no, not that one" is exercising the only kind of consent a three-year-
 * old can meaningfully give, and it should take one press.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAccess();
  if ("error" in auth) return auth.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { error } = await auth.supabase
    .from("child_voice_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Deleting a child's words failed:", error);
    return NextResponse.json({ error: "Could not delete that." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
