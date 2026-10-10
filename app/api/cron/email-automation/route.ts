import { NextResponse } from "next/server";

import { runLifecycleAutomation } from "@/lib/email/automation";
import { settleAllFoundingDiscounts } from "@/lib/centre-offer";
import { createStripe } from "@/lib/stripe-client";

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

    return NextResponse.json({ ...result, founding, ran_at: new Date().toISOString() });
  } catch (error) {
    console.error("Email automation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email automation failed" },
      { status: 500 }
    );
  }
}
