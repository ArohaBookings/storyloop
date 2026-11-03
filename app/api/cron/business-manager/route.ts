import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReport } from "@/lib/business-manager";

// One model call at most per run (lib/business-manager.ts), plus Stripe and database reads.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * The weekly business report (vercel.json: Sunday 20:00 UTC, Monday morning in
 * New Zealand). Counts the week, writes the rundown, stores it in the admin log
 * and emails it to ADMIN_EMAIL. Once per week ending: a second delivery returns
 * "already reported". ?dryRun=1 counts without the model, storing or emailing.
 */
function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
    const force = request.nextUrl.searchParams.get("force") === "1";
    return NextResponse.json(await runWeeklyReport({ dryRun, force }));
  } catch (error) {
    console.error("Weekly business report failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}
