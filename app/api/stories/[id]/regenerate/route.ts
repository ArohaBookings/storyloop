import { NextRequest, NextResponse } from "next/server";
import { generateLearningStory } from "@/lib/ai/generate";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMonthlyStoryLimit, getRemainingStories } from "@/lib/story-limits";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import {
  mergeStoryPreferences,
  normalizeDepth,
  normalizeFramework,
  normalizeTeReoLevel,
  normalizeTone,
  sanitizeStoryPreferences,
} from "@/lib/story-options";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isMissingUpdatedAtColumn(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("updated_at")
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to regenerate stories" }, { status: 401 });
    }

    const profile = await getOrCreateProfile(user);
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Your account has been disabled. Contact support." }, { status: 403 });
    }
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    const { data: existingStory, error: storyError } = await supabase
      .from("stories")
      .select("id, observations, child_name, age_group, tone, location, metadata")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (storyError || !existingStory) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (!existingStory.observations || existingStory.observations.trim().length < 10) {
      return NextResponse.json({ error: "This story does not have enough original observation text to regenerate." }, { status: 400 });
    }

    const plan = profile.plan ?? "free";
    const used = profile.stories_this_month ?? 0;
    const limit = getMonthlyStoryLimit(profile);

    if (limit !== null && used >= limit) {
      return NextResponse.json({
        error: plan === "free"
          ? "You've used your 3 free stories this month. Upgrade to keep creating or regenerating learning stories."
          : "Monthly limit reached.",
        upgradeRequired: plan === "free",
      }, { status: 403 });
    }

    const existingMetadata =
      existingStory.metadata && typeof existingStory.metadata === "object"
        ? (existingStory.metadata as Record<string, unknown>)
        : {};
    const existingSettings =
      existingMetadata.storySettings && typeof existingMetadata.storySettings === "object"
        ? (existingMetadata.storySettings as Record<string, unknown>)
        : {};
    const profilePreferences = sanitizeStoryPreferences(profile.story_preferences);
    const framework = normalizeFramework(
      typeof body.location === "string"
        ? body.location
        : typeof existingStory.location === "string"
          ? existingStory.location
          : profilePreferences.defaultFramework
    );
    const tone = normalizeTone(
      typeof body.tone === "string"
        ? body.tone
        : typeof existingStory.tone === "string"
          ? existingStory.tone
          : profilePreferences.preferredTone
    );
    const depth = normalizeDepth(
      typeof body.depth === "string"
        ? body.depth
        : typeof existingSettings.depth === "string"
          ? existingSettings.depth
          : profilePreferences.depthPreference
    );
    const includeTeReoLevel = normalizeTeReoLevel(
      typeof body.includeTeReoLevel === "string"
        ? body.includeTeReoLevel
        : typeof existingSettings.includeTeReoLevel === "string"
          ? existingSettings.includeTeReoLevel
          : profilePreferences.includeTeReoLevel
    );
    const includeKowhitiWhakapae =
      typeof body.includeKowhitiWhakapae === "boolean"
        ? body.includeKowhitiWhakapae
        : typeof existingSettings.includeKowhitiWhakapae === "boolean"
          ? existingSettings.includeKowhitiWhakapae
          : profilePreferences.includeKowhitiWhakapae ?? false;
    const includeTapasa =
      typeof body.includeTapasa === "boolean"
        ? body.includeTapasa
        : typeof existingSettings.includeTapasa === "boolean"
          ? existingSettings.includeTapasa
          : profilePreferences.includeTapasa ?? false;
    const preferences = mergeStoryPreferences(profilePreferences, {
      defaultFramework: framework,
      preferredTone: tone,
      depthPreference: depth,
      includeTeReoLevel,
      includeKowhitiWhakapae,
      includeTapasa,
    });

    const result = await generateLearningStory({
      observations: existingStory.observations,
      ageGroup: existingStory.age_group ?? undefined,
      childName: existingStory.child_name ?? undefined,
      tone,
      depth,
      framework,
      includeTeReoLevel,
      includeKowhitiWhakapae,
      includeTapasa,
      preferences,
    });

    const updatedAt = new Date().toISOString();
    const metadata = {
      ...existingMetadata,
      storyTitle: result.storyTitle,
      learningSummary: result.learningSummary,
      childVoice: result.childVoice,
      curriculumLinks: result.curriculumLinks,
      learningDispositions: result.learningDispositions,
      socialEmotionalLinks: result.socialEmotionalLinks,
      culturalConnections: result.culturalConnections,
      whanauConnection: result.whanauConnection,
      assumptions: result.assumptions,
      editedAt: updatedAt,
      storySettings: {
        framework,
        tone,
        depth,
        includeTeReoLevel,
        includeKowhitiWhakapae,
        includeTapasa,
      },
    };

    const updatePayload = {
      story_text: result.story,
      outcomes: result.outcomes,
      next_steps: result.nextSteps,
      tone,
      location: framework,
      word_count: result.wordCount,
      metadata,
      updated_at: updatedAt,
    };

    let { error: updateError } = await supabase
      .from("stories")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id);

    if (isMissingUpdatedAtColumn(updateError)) {
      const { updated_at: _updatedAt, ...fallbackPayload } = updatePayload;
      const fallback = await supabase
        .from("stories")
        .update(fallbackPayload)
        .eq("id", id)
        .eq("user_id", user.id);
      updateError = fallback.error;
    }

    if (updateError) {
      return NextResponse.json({ error: "Could not save regenerated story" }, { status: 500 });
    }

    await supabase
      .from("profiles")
      .update({
        stories_this_month: used + 1,
        total_stories: (profile.total_stories ?? 0) + 1,
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      storyId: id,
      storyTitle: result.storyTitle,
      story: result.story,
      outcomes: result.outcomes,
      curriculumLinks: result.curriculumLinks,
      learningSummary: result.learningSummary,
      childVoice: result.childVoice,
      learningDispositions: result.learningDispositions,
      socialEmotionalLinks: result.socialEmotionalLinks,
      culturalConnections: result.culturalConnections,
      whanauConnection: result.whanauConnection,
      assumptions: result.assumptions,
      nextSteps: result.nextSteps,
      updatedAt,
      remaining:
        limit === null
          ? "unlimited"
          : getRemainingStories({ ...profile, stories_this_month: used + 1 }),
    });
  } catch (error) {
    console.error("Story regenerate error:", error);
    return NextResponse.json({ error: "Could not regenerate story" }, { status: 500 });
  }
}
