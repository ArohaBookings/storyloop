import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/email/config";
import { CLASS_SET_ON } from "@/lib/build-switches";
import { checkUrl } from "@/lib/story-check";
import { cleanPieces, setExpiry, setView } from "@/lib/leader-sets";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { cancelLeaderSet, createLeaderSet, recentSetsFor } from "@/lib/leader-sets-server";
import { emailLeaderIfAsked } from "@/lib/leader-send-server";

/**
 * A whole room's statements to the leader as one set (25 Nov 2026, A1).
 * POST makes it from the pieces in her tab and returns the link once; the
 * statements are stored only now, when she pressed Send, and the panel told
 * her so first. DELETE ?id= cancels one. GET lists where her recent sets stand.
 */
async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  if (!CLASS_SET_ON) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedIn();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ sets: await recentSetsFor(user.id) });
}

export async function POST(request: NextRequest) {
  try {
    if (!CLASS_SET_ON) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const user = await signedIn();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const pieces = cleanPieces(body.pieces);
    if (!pieces) return NextResponse.json({ error: "There is nothing to send yet. Draft a statement first." }, { status: 400 });
    const now = new Date();
    if (body.preview === true) {
      // "See what your leader will see": the leader's page built from these pieces by the same setView. Nothing is stored.
      const { data: profile } = await createAdminSupabase().from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const view = setView({
        set: { id: "preview", user_id: user.id, status: "opened", centre_name: typeof body.centreName === "string" ? body.centreName : null, join_consent: body.joinConsent === true, created_at: now.toISOString(), opened_at: now.toISOString(), expires_at: setExpiry(now).toISOString(), revoked_at: null },
        items: pieces.map((p) => ({ position: p.position, mode: p.mode, framework: p.framework, child_first_name: p.childFirstName, note: p.note, draft: p.draft, decision: null, comment: null, decided_at: null })),
        educatorName: profile?.full_name ?? null,
        now,
        offer: null,
      });
      return NextResponse.json({ view }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!(await consumeRateLimit({ scope: "leader-set", key: user.id, limit: 20, windowSeconds: 86_400 }))) {
      return NextResponse.json({ error: "That is a lot of sets for one day. Try again tomorrow." }, { status: 429 });
    }
    const made = await createLeaderSet({ userId: user.id, pieces, centreName: body.centreName, joinConsent: body.joinConsent === true, now });
    if (!made.ok) return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
    const email = await emailLeaderIfAsked({
      userId: user.id, body, kind: "set", setId: made.setId, token: made.token,
      centreName: typeof body.centreName === "string" ? body.centreName : "", pieces: pieces.length, expiresAt: setExpiry(now).toISOString(),
    });
    return NextResponse.json({ url: checkUrl(SITE_URL, made.token), setId: made.setId, pieces: pieces.length, email });
  } catch (error) {
    console.error("Leader set error:", error);
    return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await signedIn();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ok = await cancelLeaderSet(user.id, id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
