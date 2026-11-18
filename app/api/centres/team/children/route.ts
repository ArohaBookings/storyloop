import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkTeamChildren, splitTeamChild } from "@/lib/centre-team-server";

/**
 * The centre's own list of children (18 Nov 2026): a leader says two
 * educators' "Mia" are one child, so the team's evidence counts her once, or
 * undoes it. Only children the leader can already read (lib/centre-team.ts
 * canLinkProfiles). No educator's own child profile is ever changed.
 */
async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const result = await linkTeamChildren(user.id, body.profileIds);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Team children error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "That did not save. Try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const result = await splitTeamChild(user.id, body.centreChildId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Team children error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "That did not save. Try again." }, { status: 500 });
  }
}
