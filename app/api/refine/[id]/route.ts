import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Accept an edit (counts toward the monthly cap) and/or leave 👍/👎 feedback
// that we use to keep Quill sharp over time.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

    const body = await request.json();
    const update: Record<string, unknown> = {};
    if (typeof body.accepted === "boolean") update.accepted = body.accepted;
    if (body.feedback === 1 || body.feedback === -1) update.feedback = body.feedback;
    if (typeof body.feedbackNote === "string") update.feedback_note = body.feedbackNote.slice(0, 500);

    if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

    await createAdminSupabase()
      .from("assistant_edits")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Quill feedback error:", error);
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
}
