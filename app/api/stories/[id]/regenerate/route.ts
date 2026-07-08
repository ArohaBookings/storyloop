import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { generateLearningStory } from "@/lib/ai/generate";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMonthlyStoryLimit, getRemainingStories } from "@/lib/story-limits";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { normalizePlanKey } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  mergeStoryPreferences,
  normalizeDepth,
  normalizeFramework,
  normalizePedagogyFocus,
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

function normalizeEducatorNames(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => (typeof entry === "string" ? entry.trim().replace(/\s+/g, " ") : ""))
          .filter((entry) => entry.length > 1)
          .slice(0, 4)
      )
    );
  }

  if (typeof value === "string") {
    return normalizeEducatorNames(value.split(","));
  }

  return [];
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
    const limit = getMonthlyStoryLimit(profile);

    // Improving an existing story is a correction, not a new story. It rewrites
    // the same row in place, so it must never spend a monthly credit or be
    // blocked once the free allowance is used up. Only free accounts get a light
    // rate limit so this can't become an unlimited free-generation loop; paid
    // plans are unlimited and keep their exact existing behaviour (no new path).
    if (normalizePlanKey(plan) === "free") {
      const allowed = await consumeRateLimit({
        scope: "story-regenerate",
        key: user.id,
        limit: 20,
        windowSeconds: 60 * 60,
      });
      if (!allowed) {
        return NextResponse.json(
          { error: "You've improved a lot of stories in a short time. Try again in a little while." },
          { status: 429 }
        );
      }
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
    const includeTeReoLevel = framework === "NZ"
      ? normalizeTeReoLevel(
          typeof body.includeTeReoLevel === "string"
            ? body.includeTeReoLevel
            : typeof existingSettings.includeTeReoLevel === "string"
              ? existingSettings.includeTeReoLevel
              : profilePreferences.includeTeReoLevel
        )
      : "low";
    const includeKowhitiWhakapae =
      framework === "NZ"
        ? typeof body.includeKowhitiWhakapae === "boolean"
          ? body.includeKowhitiWhakapae
          : typeof existingSettings.includeKowhitiWhakapae === "boolean"
            ? existingSettings.includeKowhitiWhakapae
            : profilePreferences.includeKowhitiWhakapae ?? false
        : false;
    const includeTapasa =
      typeof body.includeTapasa === "boolean"
        ? body.includeTapasa
        : typeof existingSettings.includeTapasa === "boolean"
          ? existingSettings.includeTapasa
          : profilePreferences.includeTapasa ?? false;
    const pedagogyFocus = normalizePedagogyFocus(
      typeof body.pedagogyFocus === "string"
        ? body.pedagogyFocus
        : typeof existingSettings.pedagogyFocus === "string"
          ? existingSettings.pedagogyFocus
          : profilePreferences.pedagogyFocus
    );
    const educatorNames = normalizeEducatorNames(
      typeof body.educatorNames !== "undefined" ? body.educatorNames : existingSettings.educatorNames
    );
    const preferences = mergeStoryPreferences(profilePreferences, {
      defaultFramework: framework,
      preferredTone: tone,
      depthPreference: depth,
      includeTeReoLevel,
      includeKowhitiWhakapae,
      includeTapasa,
      pedagogyFocus,
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
      pedagogyFocus,
      preferences,
      educatorNames,
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
      evidenceAnchors: result.evidenceAnchors,
      educatorChecks: result.educatorChecks,
      pedagogyLinks: result.pedagogyLinks,
      frameworkEvidence: result.frameworkEvidence,
      storyQuality: result.storyQuality,
      privacyGuardian: result.privacyGuardian,
      familyQuestion: result.familyQuestion,
      followUpPrompt: result.followUpPrompt,
      followUpStatus: existingMetadata.followUpStatus ?? "open",
      editedAt: updatedAt,
      storySettings: {
        framework,
        tone,
        depth,
        includeTeReoLevel,
        includeKowhitiWhakapae,
        includeTapasa,
        pedagogyFocus,
        educatorNames,
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
      const fallbackPayload: Record<string, unknown> = { ...updatePayload };
      delete fallbackPayload.updated_at;
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

    // Story counters intentionally stay put: regenerating edits the existing
    // story row in place, so it is not a new story. (Incrementing total_stories
    // here previously drifted the lifetime count above the real number of rows.)
    // Only refresh the activity timestamp.
    await supabase
      .from("profiles")
      .update({ last_story_at: updatedAt })
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
      evidenceAnchors: result.evidenceAnchors,
      educatorChecks: result.educatorChecks,
      pedagogyLinks: result.pedagogyLinks,
        frameworkEvidence: result.frameworkEvidence,
        storyQuality: result.storyQuality,
        privacyGuardian: result.privacyGuardian,
        familyQuestion: result.familyQuestion,
      followUpPrompt: result.followUpPrompt,
      nextSteps: result.nextSteps,
      updatedAt,
      // Regenerating does not consume a credit, so remaining is unchanged.
      remaining: limit === null ? "unlimited" : getRemainingStories(profile),
    });
  } catch (error) {
    console.error("Story regenerate error:", error);
    return NextResponse.json({ error: "Could not regenerate story" }, { status: 500 });
  }
}
