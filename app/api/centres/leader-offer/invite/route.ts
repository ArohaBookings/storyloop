import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { inviteFromLeaderOffer } from "@/lib/leader-offer-server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * "Invite Sam", one tap (lib/leader-offer-server.ts). The same invitation the
 * email form makes, to the educator's own account; the address never leaves
 * the server. Counted against the same hourly invitation limit as the form.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  const allowed = await consumeRateLimit({ scope: "centre-invite", key: user.id, limit: 30, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ error: "Too many invitations just now. Try again shortly." }, { status: 429, headers: NO_STORE });
  try {
    const result = await inviteFromLeaderOffer(user.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ offer: result.summary }, { headers: NO_STORE });
  } catch (error) {
    console.error("Leader offer invite error:", error);
    return NextResponse.json({ error: "Could not create the invitation. Try again." }, { status: 500, headers: NO_STORE });
  }
}
