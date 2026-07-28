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
  is_internal?: boolean | null;
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
  // Founder/staff/comp accounts are real accounts, but lifecycle nudges aimed at
  // customers should not go to them.
  if (row.is_internal) return { type, status: "skipped_internal" };
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
    "id, email, full_name, plan, subscription_status, total_stories, stories_this_month, monthly_story_limit_override, applied_access_code, created_at, upgraded_at, last_story_at, marketing_unsubscribed_at, is_internal";

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

  // --- Retention triggers -------------------------------------------------
  // These exist because the most active user the product ever had wrote 18
  // stories in four days, went silent, and cancelled without us contacting her
  // once. Each one targets a specific moment where a customer is quietly lost.

  // 1. Trial ending. Nobody should be charged without warning. Stripe trials
  //    are 7 days, so this catches people on day 5-6.
  const { data: trialEndingUsers, error: trialEndingError } = await sb
    .from("profiles")
    .select(baseSelect)
    .eq("subscription_status", "trialing")
    .lte("created_at", daysAgo(5))
    .limit(75);

  if (trialEndingError) errors.push(trialEndingError.message);
  for (const row of (trialEndingUsers ?? []) as ProfileEmailRow[]) {
    // Transactional: sent even to people unsubscribed from product tips.
    sent.push(await sendIfNeeded(row, "trial_ending", daysAgo(14)));
  }

  // 2. Went quiet. A paying customer who was clearly getting value (3+ stories)
  //    and has now not written one for a week is the single strongest churn
  //    signal we have.
  const { data: quietUsers, error: quietError } = await sb
    .from("profiles")
    .select(baseSelect)
    .in("subscription_status", Array.from(ACTIVE_PAID_STATUSES))
    .gte("total_stories", 3)
    .lte("last_story_at", daysAgo(7))
    .gte("last_story_at", daysAgo(45))
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (quietError) errors.push(quietError.message);
  for (const row of (quietUsers ?? []) as ProfileEmailRow[]) {
    sent.push(await sendIfNeeded(row, "went_quiet", daysAgo(21)));
  }

  // 3. Win-back. Sent a fortnight after cancelling, when the next block of
  //    documentation is starting to bite rather than while they still feel
  //    caught up. Only to people who actually used the product.
  const { data: winbackUsers, error: winbackError } = await sb
    .from("profiles")
    .select(baseSelect)
    .eq("subscription_status", "cancelled")
    .gte("total_stories", 1)
    .lte("last_story_at", daysAgo(14))
    .gte("last_story_at", daysAgo(90))
    .is("marketing_unsubscribed_at", null)
    .limit(75);

  if (winbackError) errors.push(winbackError.message);
  for (const row of (winbackUsers ?? []) as ProfileEmailRow[]) {
    // Once per quarter at most. A win-back that nags is just spam.
    sent.push(await sendIfNeeded(row, "winback_offer", daysAgo(90)));
  }

  return { success: errors.length === 0, sent, errors };
}

export async function sendManualLifecycleEmail(userId: string, emailType: LifecycleEmailType) {
  const { data: profile, error } = await createAdminSupabase()
    .from("profiles")
    .select("id, email, full_name, plan, subscription_status, total_stories, stories_this_month, monthly_story_limit_override, applied_access_code, created_at, upgraded_at, last_story_at, marketing_unsubscribed_at, is_internal")
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
