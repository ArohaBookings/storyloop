import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase, logAdminAction } from "@/lib/supabase/admin";
import { sendManualLifecycleEmail } from "@/lib/email/automation";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import type { LifecycleEmailType } from "@/lib/email/templates";
import { PLAN_ORDER, normalizePlanKey } from "@/lib/plans";
import {
  guardAdminAction,
  guardStoryLimitOverride,
  hasLiveStripeSubscription,
  isChargedWhileComped,
  sanitizeAdminSearch,
} from "@/lib/admin-guards";

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

  const sb = createAdminSupabase();
  const id = request.nextUrl.searchParams.get("id");

  // ------------------------------------------------ one user, everything an
  // operator needs to debug an account. Counts and dates only for stories:
  // titles and text are about children and are not needed to fix an account.
  if (id) {
    const [profileRes, emailsRes, auditRes, storiesRes, lastStoriesRes, membershipRes] = await Promise.all([
      sb.from("profiles").select("*").eq("id", id).maybeSingle(),
      sb
        .from("email_events")
        .select("email_type, delivery_status, subject, sent_at, metadata")
        .eq("user_id", id)
        .order("sent_at", { ascending: false })
        .limit(50),
      sb
        .from("admin_audit_log")
        .select("action, details, created_at")
        .eq("target_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      sb.from("stories").select("id", { count: "exact", head: true }).eq("user_id", id),
      sb.from("stories").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(200),
      sb.from("centre_members").select("centre_id, role, status, shares_stories, joined_at").eq("user_id", id).maybeSingle(),
    ]);

    if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 });
    if (!profileRes.data) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      profile: profileRes.data,
      billing: {
        liveStripeSubscription: hasLiveStripeSubscription(profileRes.data),
        chargedWhileComped: isChargedWhileComped(profileRes.data),
      },
      emails: emailsRes.data ?? [],
      audit: auditRes.data ?? [],
      storyCount: storiesRes.count ?? 0,
      storyDates: (lastStoriesRes.data ?? []).map((row) => row.created_at),
      // The centre tables may not exist yet; a missing relation is just "none".
      membership: membershipRes.error ? null : membershipRes.data ?? null,
    });
  }

  // ------------------------------------------------------------------ list
  // The search term goes into a PostgREST `or` filter, where commas and
  // parentheses are structure. Unsanitised, a search could append its own
  // conditions to the query.
  const search = sanitizeAdminSearch(request.nextUrl.searchParams.get("search"));
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

    const { action, userId, email, plan, emailType, value } = await request.json();
    const sb = createAdminSupabase();

    // Anything that changes access is checked against Stripe state first. On a
    // live subscription these would leave the card charged for access the
    // customer no longer has, so they are refused with the fix spelled out.
    if (typeof userId === "string" && userId) {
      const { data: target } = await sb
        .from("profiles")
        .select("plan, subscription_status, stripe_subscription_id, is_internal")
        .eq("id", userId)
        .maybeSingle();
      const verdict = guardAdminAction(String(action), target ?? null);
      if (!verdict.allowed) {
        await logAdminAction(`blocked_${String(action)}`, "user", userId, { email, reason: verdict.reason });
        return NextResponse.json({ error: verdict.reason, blocked: true }, { status: 409 });
      }
    }

    switch (action) {
      case "set_internal": {
        // Excludes founder, staff and comp accounts from every revenue figure.
        if (typeof value !== "boolean") return NextResponse.json({ error: "value must be true or false" }, { status: 400 });
        await sb.from("profiles").update({ is_internal: value }).eq("id", userId);
        await logAdminAction("set_internal", "user", userId, { email, value });
        return NextResponse.json({ message: value ? `${email} excluded from metrics` : `${email} counted in metrics again` });
      }
      case "set_story_limit_override": {
        // Support tool for FREE accounts only. The override wins over the plan,
        // so on a paid plan it would cap an unlimited customer; the guard
        // refuses that. Clearing is always allowed.
        const { data: target } = await sb.from("profiles").select("plan").eq("id", userId).maybeSingle();
        const verdict = guardStoryLimitOverride(target ?? null, value);
        if (!verdict.allowed) {
          await logAdminAction("blocked_set_story_limit_override", "user", userId, { email, value, reason: verdict.reason });
          return NextResponse.json({ error: verdict.reason, blocked: true }, { status: 409 });
        }
        const stored = value === 0 ? null : value;
        await sb.from("profiles").update({ monthly_story_limit_override: stored }).eq("id", userId);
        await logAdminAction("set_story_limit_override", "user", userId, { email, value: stored });
        return NextResponse.json({ message: stored === null ? "Story limit override cleared" : `Story limit set to ${stored} this month` });
      }
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
