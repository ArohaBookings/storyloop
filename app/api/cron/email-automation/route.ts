import { NextResponse } from "next/server";

import { runLifecycleAutomation } from "@/lib/email/automation";

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runLifecycleAutomation();
    return NextResponse.json({ ...result, ran_at: new Date().toISOString() });
  } catch (error) {
    console.error("Email automation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email automation failed" },
      { status: 500 }
    );
  }
}
