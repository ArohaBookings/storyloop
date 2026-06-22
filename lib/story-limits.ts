import { normalizePlanKey } from "@/lib/plans";

const DEFAULT_FREE_LIMIT = 3;

type StoryLimitProfile = {
  plan?: string | null;
  monthly_story_limit_override?: number | null;
  stories_this_month?: number | null;
  applied_access_code?: string | null;
};

export function getMonthlyStoryLimit(profile: StoryLimitProfile) {
  if (
    typeof profile.monthly_story_limit_override === "number" &&
    Number.isFinite(profile.monthly_story_limit_override) &&
    profile.monthly_story_limit_override > 0
  ) {
    return profile.monthly_story_limit_override;
  }

  if (normalizePlanKey(profile.plan) === "free") {
    return DEFAULT_FREE_LIMIT;
  }

  return null;
}

export function getRemainingStories(profile: StoryLimitProfile) {
  const limit = getMonthlyStoryLimit(profile);
  if (limit === null) return null;
  return Math.max(limit - (profile.stories_this_month ?? 0), 0);
}

export function getStoryAllowanceLabel(profile: StoryLimitProfile) {
  const limit = getMonthlyStoryLimit(profile);
  if (limit === null) return "Unlimited stories";

  if (profile.applied_access_code) {
    return `${limit} stories/month via ${profile.applied_access_code.toUpperCase()}`;
  }

  return `${limit} stories/month`;
}
