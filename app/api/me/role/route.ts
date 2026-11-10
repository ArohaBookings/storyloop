import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { CENTRE_CARD_DISMISSED_EVENT, ROLE_EVENT, cleanWorkRole } from "@/lib/work-role";

/**
 * Records what the signed-in educator does (lib/work-role.ts), or that they
 * closed the centre card. Written by the server with the session's own user id,
 * so one account cannot answer for another.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const allowed = await consumeRateLimit({ scope: "work-role", key: user.id, limit: 20, windowSeconds: 24 * 60 * 60 });
    if (!allowed) return NextResponse.json({ ok: true });

    const body = await request.json().catch(() => ({}));
    const dismiss = body?.dismissCentreCard === true;
    const role = cleanWorkRole(body?.role);
    if (!dismiss && !role) return NextResponse.json({ error: "Pick one of the answers." }, { status: 400 });

    const { error } = await createAdminSupabase().from("page_events").insert({
      event_type: dismiss ? CENTRE_CARD_DISMISSED_EVENT : ROLE_EVENT,
      session_id: `app-${user.id}`,
      user_id: user.id,
      path: "/dashboard",
      country: request.headers.get("x-vercel-ip-country")?.slice(0, 4) ?? null,
      metadata: dismiss ? {} : { role },
    });
    if (error) {
      console.error("Work role save failed:", error.message);
      return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, role: dismiss ? undefined : role });
  } catch (error) {
    console.error("Work role error:", error);
    return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
  }
}
