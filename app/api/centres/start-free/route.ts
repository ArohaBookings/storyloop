import { NextResponse } from "next/server";

/**
 * POST /api/centres/start-free: a leader starts her centre free until
 * 31 January 2027 with no payment page (25 Nov 2026, switch
 * CENTRE_START_NO_CHECKOUT).
 *
 * Contract:
 *   request  { offerRef?: string, centreName?: string }
 *   success  200 { centreId: string, trialEndsAt: string }
 *   failure  4xx/5xx { error: string, code: string }
 *
 * STUB: not built yet, so it answers 501 and every caller keeps today's
 * no-card checkout. Lane B owns the body; it calls joinFromLeaderOffer
 * (lib/leader-offer-server.ts) when an offer reference is given.
 */
export type StartFreeRequest = { offerRef?: string; centreName?: string };
export type StartFreeResponse = { centreId: string; trialEndsAt: string } | { error: string; code: string };

export async function POST() {
  return NextResponse.json<StartFreeResponse>({ error: "Not available yet.", code: "not_built" }, { status: 501 });
}
