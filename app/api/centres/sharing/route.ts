import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/centres";

/**
 * The consent switch.
 *
 * Only the educator themselves can move it. Not their centre owner, not an
 * admin, not support. There is no path in this codebase for anyone else to set
 * shares_stories, and there should not be: the whole promise is that leadership
 * sees that you are writing, not what you wrote, until you decide otherwise.
 *
 * Reversible in both directions, immediately. Consent that cannot be withdrawn
 * is not consent.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembership(user.id);
    if (!membership) return NextResponse.json({ error: "You are not in a centre." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    if (typeof body.sharesStories !== "boolean") {
      return NextResponse.json({ error: "Say true or false." }, { status: 400 });
    }

    const { error } = await createAdminSupabase()
      .from("centre_members")
      .update({ shares_stories: body.sharesStories })
      .eq("centre_id", membership.centreId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Sharing toggle failed:", error.message);
      return NextResponse.json({ error: "Could not save that." }, { status: 500 });
    }

    return NextResponse.json({ sharesStories: body.sharesStories });
  } catch (error) {
    console.error("Sharing toggle error:", error);
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
}
