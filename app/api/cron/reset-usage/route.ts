import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.rpc("reset_monthly_usage");
    if (error) throw error;
    return NextResponse.json({ success: true, reset_at: new Date().toISOString() });
  } catch (error) {
    console.error("Monthly reset error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
