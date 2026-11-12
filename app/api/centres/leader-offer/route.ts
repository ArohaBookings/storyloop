import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { claimLeaderOffer, leaderOfferFor } from "@/lib/leader-offer-server";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The centre offer from a story an educator sent (lib/leader-offer-server.ts).
 * GET: the offer this account has claimed, if any. POST { ref }: claim one.
 * Both return the educator's first name, the centre name she typed and where
 * the invitation stands, and nothing else. The reference arrives in the body,
 * never a URL. Any "no" is the same 404.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  const offer = await leaderOfferFor(user.id);
  return NextResponse.json({ offer }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  const allowed = await consumeRateLimit({ scope: "leader-offer-claim", key: user.id, limit: 20, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ error: "Too many tries just now." }, { status: 429, headers: NO_STORE });
  const body = await request.json().catch(() => ({}));
  const offer = await claimLeaderOffer(user.id, body?.ref);
  if (!offer) return NextResponse.json({ offer: null }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ offer }, { headers: NO_STORE });
}
