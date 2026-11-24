import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership } from "@/lib/centres";

/**
 * "Leave this team" (25 Nov 2026). The leader path adds an educator to her
 * leader's centre when she ticked the box, so she must be able to undo it,
 * herself, at any time. Her membership row goes; stories she already sent stay
 * sent, and what she can use follows the normal rules from here (a centre's
 * cover ends with the membership). The owner cannot leave her own centre this
 * way: a centre is never left without its owner.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const membership = await getMembership(user.id);
    if (!membership) return NextResponse.json({ error: "You are not in a team." }, { status: 404 });
    if (membership.role === "owner") return NextResponse.json({ error: "You run this centre, so you cannot leave it." }, { status: 403 });
    const { error } = await createAdminSupabase()
      .from("centre_members")
      .delete()
      .eq("centre_id", membership.centreId)
      .eq("user_id", user.id)
      .neq("role", "owner");
    if (error) {
      console.error("Leave team failed:", error.message);
      return NextResponse.json({ error: "That did not work. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Leave team error:", error);
    return NextResponse.json({ error: "That did not work. Try again." }, { status: 500 });
  }
}
