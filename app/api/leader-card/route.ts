import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getMembership } from "@/lib/centres";
import { isCentrePlan } from "@/lib/centre-offer";
import { workRoleFacts } from "@/lib/work-role-server";
import { LEADER_CARD_DISMISSED_EVENT, readLeaderCardRequest, showsLeaderCard } from "@/lib/leader-card";

const NO_STORE = { "Cache-Control": "no-store" };
/** A fresh "no card" answer each time: a response body can be read only once. */
const hide = () => NextResponse.json({ show: false }, { headers: NO_STORE });

/**
 * "Send this to my leader" (lib/leader-card.ts). After a copy the story page
 * asks whether to show the card; "No thanks" is kept here for good. Every
 * answer is worked out on the server from her own account, and any failure
 * answers "no card": a card that should not show is worse than one missed.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });

    const ask = readLeaderCardRequest(await request.json().catch(() => ({})));
    if (!ask) return NextResponse.json({ error: "Not a request this answers." }, { status: 400, headers: NO_STORE });

    const allowed = await consumeRateLimit({ scope: "leader-card", key: user.id, limit: 200, windowSeconds: 24 * 60 * 60 });
    const admin = createAdminSupabase();

    if (ask.action === "dismiss") {
      if (!allowed) return NextResponse.json({ ok: true }, { headers: NO_STORE });
      const { error } = await admin.from("page_events").insert({
        event_type: LEADER_CARD_DISMISSED_EVENT,
        session_id: `app-${user.id}`,
        user_id: user.id,
        path: "/generate",
        metadata: {},
      });
      if (error) {
        console.error("Leader card dismiss failed:", error.message);
        return NextResponse.json({ error: "Could not save that." }, { status: 500, headers: NO_STORE });
      }
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }

    if (!allowed) return hide();
    const [story, count, membership, profile, role, dismissed, sent] = await Promise.all([
      admin.from("stories").select("id").eq("id", ask.storyId).eq("user_id", user.id).maybeSingle(),
      admin.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      getMembership(user.id),
      admin.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      workRoleFacts(user.id).then((facts) => facts.role).catch(() => "unknown" as const),
      admin.from("page_events").select("id").eq("user_id", user.id).eq("event_type", LEADER_CARD_DISMISSED_EVENT).limit(1),
      admin.from("story_checks").select("id").eq("user_id", user.id).limit(1),
    ]);
    if (story.error || count.error || profile.error || dismissed.error || sent.error || role === "unknown") return hide();

    const show = showsLeaderCard({
      storyIsHers: Boolean(story.data),
      stories: count.count ?? 0,
      inCentre: Boolean(membership),
      centrePlan: isCentrePlan(profile.data?.plan),
      role,
      dismissed: (dismissed.data ?? []).length > 0,
      sentBefore: (sent.data ?? []).length > 0,
    });
    return NextResponse.json({ show }, { headers: NO_STORE });
  } catch (error) {
    console.error("Leader card error:", error instanceof Error ? error.message : "unknown");
    return hide();
  }
}
