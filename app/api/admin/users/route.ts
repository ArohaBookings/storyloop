import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase, logAdminAction } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const sb = createAdminSupabase();

  let query = sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data: users, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, userId, email, plan } = await request.json();
    const sb = createAdminSupabase();

    switch (action) {
      case "reset_password": {
        const { error } = await sb.auth.admin.generateLink({ type: "recovery", email });
        if (error) throw error;
        // Supabase also sends email automatically with generateLink of type recovery
        await logAdminAction("reset_password", "user", userId, { email });
        return NextResponse.json({ message: `Password reset sent to ${email}` });
      }
      case "magic_link": {
        const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
        if (error) throw error;
        await logAdminAction("magic_link", "user", userId, { email });
        return NextResponse.json({ message: "Magic link generated", link: data.properties?.action_link });
      }
      case "set_plan": {
        await sb.from("profiles").update({ plan, subscription_status: plan === "free" ? "cancelled" : "admin_override" }).eq("id", userId);
        await logAdminAction("set_plan", "user", userId, { email, plan });
        return NextResponse.json({ message: `Plan set to ${plan}` });
      }
      case "disable": {
        await sb.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
        await sb.from("profiles").update({ is_active: false }).eq("id", userId);
        await logAdminAction("disable_user", "user", userId, { email });
        return NextResponse.json({ message: `${email} disabled` });
      }
      case "enable": {
        await sb.auth.admin.updateUserById(userId, { ban_duration: "none" });
        await sb.from("profiles").update({ is_active: true }).eq("id", userId);
        await logAdminAction("enable_user", "user", userId, { email });
        return NextResponse.json({ message: `${email} enabled` });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin user action error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
