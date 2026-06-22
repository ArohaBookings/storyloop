import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase, logAdminAction } from "@/lib/supabase/admin";
import { sendManualLifecycleEmail } from "@/lib/email/automation";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import type { LifecycleEmailType } from "@/lib/email/templates";
import { PLAN_ORDER, normalizePlanKey } from "@/lib/plans";

const MANUAL_EMAIL_TYPES = new Set<LifecycleEmailType>([
  "welcome",
  "no_first_story",
  "first_story_created",
  "two_free_stories_used",
  "free_limit_reached",
  "paid_no_usage_checkin",
  "weekly_value",
  "feedback_request",
  "family_pack_prompt",
  "centre_planning_prompt",
]);

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

    const { action, userId, email, plan, emailType } = await request.json();
    const sb = createAdminSupabase();

    switch (action) {
      case "reset_password": {
        const result = await sendPasswordResetEmail(email);
        await logAdminAction("reset_password", "user", userId, { email, status: result.status });
        return NextResponse.json({ message: `Password reset sent to ${email}` });
      }
      case "magic_link": {
        const { data, error } = await sb.auth.admin.generateLink({ type: "magiclink", email });
        if (error) throw error;
        await logAdminAction("magic_link", "user", userId, { email });
        return NextResponse.json({ message: "Magic link generated", link: data.properties?.action_link });
      }
      case "set_plan": {
        if (typeof plan !== "string" || (!PLAN_ORDER.includes(plan as (typeof PLAN_ORDER)[number]) && plan !== "centre")) {
          return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
        }
        const normalizedPlan = normalizePlanKey(plan);
        await sb.from("profiles").update({
          plan: normalizedPlan,
          subscription_status: normalizedPlan === "free" ? "cancelled" : "admin_override",
        }).eq("id", userId);
        await logAdminAction("set_plan", "user", userId, { email, plan: normalizedPlan });
        return NextResponse.json({ message: `Plan set to ${normalizedPlan}` });
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
      case "send_lifecycle_email": {
        if (typeof emailType !== "string" || !MANUAL_EMAIL_TYPES.has(emailType as LifecycleEmailType)) {
          return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
        }
        const result = await sendManualLifecycleEmail(userId, emailType as LifecycleEmailType);
        await logAdminAction("send_lifecycle_email", "user", userId, { email, emailType, result });
        return NextResponse.json({ message: `${emailType.replaceAll("_", " ")} email queued for ${email}`, result });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin user action error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
