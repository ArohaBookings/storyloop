import { createAdminSupabase } from "@/lib/supabase/admin";
import { sanitizeStoryPreferences, type StoryPreferences } from "@/lib/story-options";

export type AccessCodeGrant = {
  code: string;
  label: string | null;
  monthlyStoryLimitOverride: number | null;
  storyPreferences: StoryPreferences;
};

function normalizeAccessCode(value: string) {
  return value.trim().toLowerCase();
}

export async function resolveAccessCode(code: string, email?: string | null): Promise<AccessCodeGrant | null> {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return null;

  const { data, error } = await createAdminSupabase().rpc("get_access_code_grant", {
    p_code: normalized,
    p_email: email ?? null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    code: row.code,
    label: row.label,
    monthlyStoryLimitOverride: row.monthly_story_limit_override,
    storyPreferences: sanitizeStoryPreferences(row.story_preferences),
  };
}

export async function incrementAccessCodeRedemption(code: string) {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return;

  const { error } = await createAdminSupabase().rpc("redeem_access_code", { p_code: normalized });
  if (error) throw error;
}
