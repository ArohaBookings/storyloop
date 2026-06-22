import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMonthlyStoryLimit } from "@/lib/story-limits";
import { sendLifecycleEmail } from "./send";
import type { LifecycleEmailType } from "./templates";

type ProfileEmailRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  total_stories: number | null;
  stories_this_month: number | null;
  monthly_story_limit_override?: number | null;
  applied_access_code?: string | null;
  created_at?: string | null;
  upgraded_at?: string | null;
  last_story_at?: string | null;
  marketing_unsubscribed_at?: string | null;
};

const ACTIVE_PAID_STATUSES = new Set(["active", "trialing", "admin_override"]);

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function sentRecently(userId: string, emailType: LifecycleEmailType, since?: string) {
  let query = createAdminSupabase()
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .in("delivery_status", ["sent", "skipped_unconfigured"])
    .limit(1);

  if (since) query = query.gte("sent_at", since);

  const { data } = await query.maybeSingle();
  return Boolean(data);
}

async function sendIfNeeded(row: ProfileEmailRow, type: LifecycleEmailType, since?: string) {
  if (!row.email) return { type, status: "missing_email" };
  if (await sentRecently(row.id, type, since)) return { type, status: "already_sent" };
  return sendLifecycleEmail({
    type,
    userId: row.id,
    recipient: row.email,
    name: row.full_name,
    metadata: { automation: true },
  });
}

export async function sendStoryMilestoneEmails({
  profile,
  storyId,
  storiesUsedThisMonth,
}: {
  profile: ProfileEmailRow;
  storyId: string | null | undefined;
  storiesUsedThisMonth: number;
}) {
  const results = [];
  const limit = getMonthlyStoryLimit(profile);

  if ((profile.total_stories ?? 0) === 0) {
    results.push(
      await sendLifecycleEmail({
        type: "first_story_created",
        userId: profile.id,
        recipient: profile.email,
        name: profile.full_name,
        relatedStoryId: storyId,
        metadata: { trigger: "first_story" },
      })
    );
  }

  if ((profile.plan ?? "free") === "free" && limit === 3 && !profile.applied_access_code) {
    if (storiesUsedThisMonth === 2) {
      results.push(
        await sendLifecycleEmail({
          type: "two_free_stories_used",
          userId: profile.id,
          recipient: profile.email,
          name: profile.full_name,
          relatedStoryId: storyId,
          metadata: { trigger: "two_free_stories_used" },
        })
      );
    }
    if (storiesUsedThisMonth >= 3) {
      results.push(
        await sendLifecycleEmail({
          type: "free_limit_reached",
          userId: profile.id,
          recipient: profile.email,
          name: profile.full_name,
          relatedStoryId: storyId,
          metadata: { trigger: "free_limit_reached" },
        })
      );
    }
  }

  return results;
}

export async function runLifecycleAutomation() {
  const sb = createAdminSupabase();
  const sent = [];
  const errors = [];

  const baseSelect =
    "id, email, full_name, plan, subscription_status, total_stories, stories_this_month, monthly_story_limit_override, applied_access_code, created_at, upgraded_at, last_story_at, marketing_unsubscribed_at";

  const { data: noStoryUsers, error: noStoryError } = await sb
    .from("profiles")
    .select(baseSelect)
    .lte("created_at", hoursAgo(24))
    .eq("total_stories", 0)
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (noStoryError) errors.push(noStoryError.message);
  for (const row of (noStoryUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "no_first_story"));
  }

  const { data: paidNoUsageUsers, error: paidNoUsageError } = await sb
    .from("profiles")
    .select(baseSelect)
    .in("plan", ["educator", "centre"])
    .in("subscription_status", Array.from(ACTIVE_PAID_STATUSES))
    .lte("upgraded_at", hoursAgo(48))
    .eq("total_stories", 0)
    .limit(75);

  if (paidNoUsageError) errors.push(paidNoUsageError.message);
  for (const row of (paidNoUsageUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "paid_no_usage_checkin"));
  }

  const { data: weeklyUsers, error: weeklyError } = await sb
    .from("profiles")
    .select(baseSelect)
    .gt("total_stories", 0)
    .gte("last_story_at", daysAgo(30))
    .is("marketing_unsubscribed_at", null)
    .limit(120);

  if (weeklyError) errors.push(weeklyError.message);
  for (const row of (weeklyUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "weekly_value", daysAgo(7)));
  }

  const { data: feedbackUsers, error: feedbackError } = await sb
    .from("profiles")
    .select(baseSelect)
    .gt("total_stories", 0)
    .lte("last_story_at", hoursAgo(12))
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (feedbackError) errors.push(feedbackError.message);
  for (const row of (feedbackUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "feedback_request"));
  }

  const { data: familyPackUsers, error: familyPackError } = await sb
    .from("profiles")
    .select(baseSelect)
    .in("plan", ["educator", "centre"])
    .in("subscription_status", Array.from(ACTIVE_PAID_STATUSES))
    .gte("total_stories", 2)
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (familyPackError) errors.push(familyPackError.message);
  for (const row of (familyPackUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "family_pack_prompt"));
  }

  const { data: centrePlanningUsers, error: centrePlanningError } = await sb
    .from("profiles")
    .select(baseSelect)
    .eq("plan", "centre")
    .in("subscription_status", Array.from(ACTIVE_PAID_STATUSES))
    .gte("total_stories", 3)
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (centrePlanningError) errors.push(centrePlanningError.message);
  for (const row of (centrePlanningUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "centre_planning_prompt"));
  }

  return { success: errors.length === 0, sent, errors };
}

export async function sendManualLifecycleEmail(userId: string, emailType: LifecycleEmailType) {
  const { data: profile, error } = await createAdminSupabase()
    .from("profiles")
    .select("id, email, full_name, plan, subscription_status, total_stories, stories_this_month, monthly_story_limit_override, applied_access_code, created_at, upgraded_at, last_story_at, marketing_unsubscribed_at")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return sendLifecycleEmail({
    type: emailType,
    userId,
    recipient: profile.email,
    name: profile.full_name,
    force: true,
    metadata: { manual: true },
  });
}
