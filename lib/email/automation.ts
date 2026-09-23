import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMonthlyStoryLimit } from "@/lib/story-limits";
import { sendLifecycleEmail } from "./send";
import { getOrCreateReferralCode } from "@/lib/referrals";
import type { LifecycleEmailType } from "./templates";
import { getPlanByKey, normalizePlanKey } from "@/lib/plans";
import { formatDate } from "./billing";
import { createStripe } from "@/lib/stripe-client";
import { abandonedCheckoutCandidates, stillAbandoned } from "@/lib/abandoned-checkout";
import { isCentrePlan } from "@/lib/centre-offer";

/**
 * Whether a trialing customer has a card on file, asked of Stripe. Only needed
 * for centres, whose free month does not ask for a card up front. Null when
 * Stripe cannot say, and the email then gives both paths instead of guessing.
 */
async function cardOnFile(customerId: string | null | undefined): Promise<boolean | null> {
  if (!customerId) return null;
  try {
    const stripe = createStripe();
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 5 });
    if (subs.data.some((sub) => Boolean(sub.default_payment_method))) return true;
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return Boolean((customer as { invoice_settings?: { default_payment_method?: unknown } }).invoice_settings?.default_payment_method);
  } catch {
    return null;
  }
}

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
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
};

const ACTIVE_PAID_STATUSES = new Set(["active", "trialing", "admin_override"]);

// Plan keys as stored on profiles. These rules used to filter on
// ["educator", "centre"], the plan names before Educator Pro and the two centre
// tiers existed, so every Educator Pro and centre customer was silently skipped.
// "centre" stays for any profile still holding the old value.
export const PAID_PLAN_KEYS = ["educator", "educator_pro", "centre_starter", "centre_growth", "centre"];
export const CENTRE_PLAN_KEYS = ["centre_starter", "centre_growth", "centre"];

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

async function sendIfNeeded(
  row: ProfileEmailRow,
  type: LifecycleEmailType,
  since?: string,
  context?: Parameters<typeof sendLifecycleEmail>[0]["context"],
) {
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
    context,
  });
}

/**
 * Which trialing accounts get the "your trial ends" notice, and what it says.
 *
 * Keyed on the trial end Stripe recorded, not on when the profile was created:
 * someone who signed up months ago and starts a trial today must not be told on
 * day one that their trial ends in two days.
 */
export const TRIAL_NOTICE_HOURS = 72;

export function trialEndingContext(row: Pick<ProfileEmailRow, "plan" | "trial_ends_at">) {
  const endsAt = row.trial_ends_at ? Date.parse(row.trial_ends_at) : Number.NaN;
  const plan = normalizePlanKey(row.plan);
  return {
    trialEndsOn: Number.isFinite(endsAt) ? (formatDate(Math.floor(endsAt / 1000)) ?? undefined) : undefined,
    planLabel: plan === "free" ? undefined : getPlanByKey(plan).name,
  };
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
    .in("plan", PAID_PLAN_KEYS)
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
    .in("plan", PAID_PLAN_KEYS)
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
    .in("plan", CENTRE_PLAN_KEYS)
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
  //    are 7 days; this catches the last three, using the trial end Stripe
  //    recorded on the profile.
  const { data: trialEndingUsers, error: trialEndingError } = await sb
    .from("profiles")
    .select(`${baseSelect}, trial_ends_at, stripe_customer_id`)
    .eq("subscription_status", "trialing")
    .gte("trial_ends_at", new Date().toISOString())
    .lte("trial_ends_at", new Date(Date.now() + TRIAL_NOTICE_HOURS * 60 * 60 * 1000).toISOString())
    .limit(75);

  if (trialEndingError) errors.push(trialEndingError.message);
  for (const row of (trialEndingUsers ?? []) as ProfileEmailRow[]) {
    // Transactional: sent even to people unsubscribed from product tips.
    // A centre's free month may have no card behind it, and "your first
    // payment will be taken" would then be untrue, so ask Stripe.
    const centre = isCentrePlan(row.plan);
    const context = { ...trialEndingContext(row), ...(centre ? { centreTrial: true, cardOnFile: await cardOnFile(row.stripe_customer_id) } : {}) };
    sent.push(await sendIfNeeded(row, "trial_ending", daysAgo(14), context));
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

  // 4. Monthly referral reminder. Once a month, remind active members who have
  //    not yet earned all five free months that they can. Only to people
  //    getting value (they have written something), so it never lands as a cold
  //    ask. The weekly marketing cap still applies, so it will not stack on top
  //    of another nudge in the same week.
  const { data: referralUsers, error: referralError } = await sb
    .from("profiles")
    .select(baseSelect)
    .in("subscription_status", Array.from(ACTIVE_PAID_STATUSES))
    .gte("total_stories", 1)
    .is("marketing_unsubscribed_at", null)
    .limit(200);

  if (referralError) errors.push(referralError.message);
  for (const row of (referralUsers ?? []) as ProfileEmailRow[]) {
    if (row.is_internal) { sent.push({ type: "referral_invite" as const, status: "skipped_internal" }); continue; }
    // Skip anyone who has already maxed out their five referral credits.
    const { count: earned } = await sb
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", row.id)
      .eq("status", "credited");
    if ((earned ?? 0) >= 5) { sent.push({ type: "referral_invite" as const, status: "already_maxed" }); continue; }
    if (await sentRecently(row.id, "referral_invite", daysAgo(30))) { sent.push({ type: "referral_invite" as const, status: "already_sent" }); continue; }

    // Put the real code and a working link in the email itself, so the reader
    // does not have to go hunting for it.
    const code = await getOrCreateReferralCode(row.id);
    sent.push(
      await sendLifecycleEmail({
        type: "referral_invite",
        userId: row.id,
        recipient: row.email,
        name: row.full_name,
        metadata: { automation: true },
        context: code ? { referralCode: code, referralsEarned: earned ?? 0 } : undefined,
      })
    );
  }

  // 5. Abandoned checkout. Someone chose a plan, reached Stripe Checkout and
  //    left. Checkout sessions expire after 24 hours, so this finds them a day
  //    or so later. Once per person ever. It skips the weekly marketing cap
  //    (it answers something they just did) but still respects unsubscribes.
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const stripe = createStripe(stripeKey);
      const sinceSeconds = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
      const sessions = [];
      for await (const session of stripe.checkout.sessions.list({ status: "expired", created: { gte: sinceSeconds }, limit: 100 })) {
        sessions.push({ id: session.id, status: session.status, created: session.created, metadata: session.metadata });
        if (sessions.length >= 500) break;
      }
      for (const candidate of abandonedCheckoutCandidates(sessions, sinceSeconds).slice(0, 50)) {
        const { data: row } = await sb.from("profiles").select(baseSelect).eq("id", candidate.userId).maybeSingle();
        const profile = row as ProfileEmailRow | null;
        if (!profile || !stillAbandoned(profile)) {
          sent.push({ type: "checkout_abandoned" as const, status: "skipped_not_abandoned" });
          continue;
        }
        if (await sentRecently(profile.id, "checkout_abandoned")) {
          sent.push({ type: "checkout_abandoned" as const, status: "already_sent" });
          continue;
        }
        sent.push(
          await sendLifecycleEmail({
            type: "checkout_abandoned",
            userId: profile.id,
            recipient: profile.email as string,
            name: profile.full_name,
            force: true,
            metadata: { automation: true, checkout_session: candidate.sessionId, plan: candidate.plan },
            context: {
              planLabel: getPlanByKey(candidate.plan).name,
              // Older sessions carry no terms; individual plans were 7 days then.
              trialDays: candidate.trialDays ?? (candidate.plan.startsWith("centre") ? undefined : 7),
              centreTrial: candidate.noCard,
              offerCode: candidate.offer ?? undefined,
            },
          })
        );
      }
    }
  } catch (error) {
    errors.push(`abandoned checkout: ${error instanceof Error ? error.message : "failed"}`);
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
