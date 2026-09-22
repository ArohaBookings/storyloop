import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";

/**
 * Recording, and withdrawing, a family's agreement that their child may record
 * their own voice notes.
 *
 * Withdrawal is not a flag flip. The database deletes everything collected
 * under that consent the moment it is removed, because a family that says
 * "actually, no" should not have to ask twice, and should not have to trust us
 * to remember. This route just tells them plainly that it happened.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "childVoice")) {
    return NextResponse.json({ error: "Children's own words is on paid plans." }, { status: 403 });
  }

  let body: { childId?: unknown; consented?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const childId = typeof body.childId === "string" ? body.childId : null;
  if (!childId || typeof body.consented !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name")
    .eq("id", childId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: "That child could not be found." }, { status: 404 });

  // How many notes are about to be deleted, so the answer can say so honestly
  // rather than leaving the educator to discover it.
  let removed = 0;
  if (!body.consented) {
    const { count } = await supabase
      .from("child_voice_notes")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .eq("user_id", user.id);
    removed = count ?? 0;
  }

  const { error } = await supabase
    .from("child_profiles")
    .update({ voice_consent_at: body.consented ? new Date().toISOString() : null })
    .eq("id", childId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Updating voice consent failed:", error);
    return NextResponse.json({ error: "Could not update that." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, consented: body.consented, removed });
}
