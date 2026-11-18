import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setSampleTeam } from "@/lib/centre-team-server";

/**
 * The sample team on or off (18 Nov 2026). It is a switch on the centre and
 * nothing else: the sample's educators, children and stories live in code
 * (lib/sample-team.ts), so turning it on writes no story, child or member.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    if (typeof body.on !== "boolean") return NextResponse.json({ error: "Say on or off." }, { status: 400 });
    const result = await setSampleTeam(user.id, body.on);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ show: result.show });
  } catch (error) {
    console.error("Sample team error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "That did not save. Try again." }, { status: 500 });
  }
}
