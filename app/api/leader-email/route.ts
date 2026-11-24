import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { LEADER_EMAIL_ON } from "@/lib/build-switches";
import { looksLikeCheckToken } from "@/lib/story-check";
import { hashCheckToken } from "@/lib/story-check-token";
import { emailLeaderIfAsked } from "@/lib/leader-send-server";

/**
 * Email a link she has just made (25 Nov 2026, A2): used when the first try
 * was held only because her account had no first name. The key comes from her
 * own screen; the link must be hers, open, and not emailed before.
 */
export async function POST(request: NextRequest) {
  if (!LEADER_EMAIL_ON) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token : "";
  if (!looksLikeCheckToken(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const admin = createAdminSupabase();
  const hash = hashCheckToken(token);
  const { data: check } = await admin.from("story_checks").select("id, user_id, centre_name, expires_at, revoked_at").eq("token_hash", hash).maybeSingle();
  const { data: set } = check ? { data: null } : await admin.from("leader_sets").select("id, user_id, centre_name, expires_at, revoked_at").eq("token_hash", hash).maybeSingle();
  const link = check ?? set;
  if (!link || link.user_id !== user.id || link.revoked_at || Date.parse(link.expires_at) <= Date.now()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const pieces = set ? ((await admin.from("leader_set_items").select("id", { count: "exact", head: true }).eq("set_id", set.id)).count ?? 1) : 1;
  const email = await emailLeaderIfAsked({
    userId: user.id, body, kind: set ? "set" : "story", checkId: check?.id, setId: set?.id, token,
    centreName: link.centre_name ?? "", pieces, expiresAt: link.expires_at,
  });
  return NextResponse.json({ email });
}
