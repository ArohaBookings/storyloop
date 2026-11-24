import { NextResponse } from "next/server";

import { runLifecycleAutomation } from "@/lib/email/automation";
import { settleAllFoundingDiscounts } from "@/lib/centre-offer";
import { createStripe } from "@/lib/stripe-client";
import { sendLeaderReminders } from "@/lib/email/leader-check";
import { purgeExpiredSets } from "@/lib/leader-sets-server";

// The run now also asks Resend about recent emails (lib/email/delivery-sync.ts, about 10s).
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runLifecycleAutomation();

    // Backstop for the invoice.paid webhook: a founding centre's discount comes
    // off after exactly three paid months even if that webhook was missed.
    // Separate from the emails, and never allowed to fail them.
    let founding: Awaited<ReturnType<typeof settleAllFoundingDiscounts>> | { error: string } | null = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        founding = await settleAllFoundingDiscounts(createStripe());
      } catch (error) {
        founding = { error: error instanceof Error ? error.message : "founding settle failed" };
      }
    }

    // The leader path (25 Nov 2026): the one reminder to a leader who has not
    // opened, then wiping whole-room sets 7 days after their links ended. Each
    // in its own try, never allowed to fail the emails above.
    let leader: { reminded: number; forgotten: number; purged: number } | { error: string } = { reminded: 0, forgotten: 0, purged: 0 };
    try {
      const reminders = await sendLeaderReminders();
      leader = { reminded: reminders.reminded, forgotten: reminders.forgotten, purged: 0 };
    } catch (error) {
      leader = { error: error instanceof Error ? error.message : "leader reminders failed" };
    }
    try {
      const purged = await purgeExpiredSets();
      if (!("error" in leader)) leader.purged = purged;
    } catch (error) {
      console.error("Leader set purge failed:", error);
    }

    const ranAt = new Date().toISOString();
    // One line per run, so a quiet day (nothing worth sending, or every send
    // held by the frequency cap) can be told apart from a run that never
    // happened (P15, Nov 2026). Counts by outcome only: no address, no name.
    console.log(`[email-cron] ran ${ranAt} ${JSON.stringify({ summary: result.summary, errors: result.errors.length, founding: founding && "error" in founding ? "error" : founding ? founding.checked : null, leader })}`);

    return NextResponse.json({ ...result, founding, leader, ran_at: ranAt });
  } catch (error) {
    console.error("Email automation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email automation failed" },
      { status: 500 }
    );
  }
}
