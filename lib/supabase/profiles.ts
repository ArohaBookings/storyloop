import type { User } from "@supabase/supabase-js";
import { createAdminSupabase } from "./admin";
import { sanitizeStoryPreferences, type StoryPreferences } from "@/lib/story-options";

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  stories_this_month: number | null;
  total_stories: number | null;
  is_active: boolean | null;
  monthly_story_limit_override: number | null;
  applied_access_code: string | null;
  last_seen_at: string | null;
  last_story_at: string | null;
  first_story_created_at: string | null;
  upgraded_at: string | null;
  marketing_unsubscribed_at: string | null;
  story_preferences: StoryPreferences;
};

const PROFILE_SELECT =
  "id, email, full_name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, stories_this_month, total_stories, is_active, monthly_story_limit_override, applied_access_code, last_seen_at, last_story_at, first_story_created_at, upgraded_at, marketing_unsubscribed_at, story_preferences";

function deriveFullName(user: Pick<User, "email" | "user_metadata">) {
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  if (fullName) return fullName;
  return user.email?.split("@")[0] ?? "StoryLoop user";
}

function normaliseProfileRecord(record: Record<string, unknown>): AppProfile {
  return {
    id: String(record.id ?? ""),
    email: typeof record.email === "string" ? record.email : null,
    full_name: typeof record.full_name === "string" ? record.full_name : null,
    plan: typeof record.plan === "string" ? record.plan : "free",
    subscription_status: typeof record.subscription_status === "string" ? record.subscription_status : "free",
    stripe_customer_id: typeof record.stripe_customer_id === "string" ? record.stripe_customer_id : null,
    stripe_subscription_id: typeof record.stripe_subscription_id === "string" ? record.stripe_subscription_id : null,
    current_period_end: typeof record.current_period_end === "string" ? record.current_period_end : null,
    stories_this_month: typeof record.stories_this_month === "number" ? record.stories_this_month : 0,
    total_stories: typeof record.total_stories === "number" ? record.total_stories : 0,
    is_active: typeof record.is_active === "boolean" ? record.is_active : true,
    monthly_story_limit_override:
      typeof record.monthly_story_limit_override === "number" ? record.monthly_story_limit_override : null,
    applied_access_code: typeof record.applied_access_code === "string" ? record.applied_access_code : null,
    last_seen_at: typeof record.last_seen_at === "string" ? record.last_seen_at : null,
    last_story_at: typeof record.last_story_at === "string" ? record.last_story_at : null,
    first_story_created_at: typeof record.first_story_created_at === "string" ? record.first_story_created_at : null,
    upgraded_at: typeof record.upgraded_at === "string" ? record.upgraded_at : null,
    marketing_unsubscribed_at:
      typeof record.marketing_unsubscribed_at === "string" ? record.marketing_unsubscribed_at : null,
    story_preferences: sanitizeStoryPreferences(record.story_preferences),
  };
}

export async function getOrCreateProfile(user: Pick<User, "id" | "email" | "user_metadata">): Promise<AppProfile> {
  const sb = createAdminSupabase();
  const { data: existing, error } = await sb
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  const email = user.email ?? null;
  const fullName = deriveFullName(user);

  if (existing) {
    const updates: Partial<AppProfile> = {};
    if (!existing.email && email) updates.email = email;
    if (!existing.full_name && fullName) updates.full_name = fullName;

    if (Object.keys(updates).length === 0) return normaliseProfileRecord(existing);

    const { data: updated, error: updateError } = await sb
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(PROFILE_SELECT)
      .single();

    if (updateError) throw updateError;
    return normaliseProfileRecord(updated);
  }

  const { data: created, error: createError } = await sb
    .from("profiles")
    .insert({
      id: user.id,
      email,
      full_name: fullName,
    })
    .select(PROFILE_SELECT)
    .single();

  if (createError) throw createError;

  return normaliseProfileRecord(created);
}
