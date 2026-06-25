import { NextRequest, NextResponse } from "next/server";

// The frontier story writer can take ~15-30s for a rich draft (plus a rare
// fix pass). Give the serverless function room so it is never killed mid-write.
export const maxDuration = 60;
import { createClient } from "@/lib/supabase/server";
import { generateLearningStory } from "@/lib/ai/generate";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMonthlyStoryLimit, getRemainingStories } from "@/lib/story-limits";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess } from "@/lib/plans";
import {
  mergeStoryPreferences,
  normalizeDepth,
  normalizeFramework,
  normalizePedagogyFocus,
  normalizeTeReoLevel,
  normalizeTone,
  sanitizeStoryPreferences,
} from "@/lib/story-options";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendStoryMilestoneEmails } from "@/lib/email/automation";
import { getStoryClarification } from "@/lib/story-clarification";
import { inferPrimaryChildName } from "@/lib/story-context";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function normalizeInputMethod(value: unknown) {
  return value === "paste" || value === "voice" || value === "sample" || value === "backlog" ? value : "typed";
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

function normalizeClarificationAnswers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim().replace(/\s+/g, " ") : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
}

function buildGenerationObservations(observations: string, clarificationAnswers: string[]) {
  const cleanObservations = observations.trim();
  if (clarificationAnswers.length === 0) return cleanObservations;

  return [cleanObservations, ...clarificationAnswers].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      observations,
      childId,
      ageGroup,
      childName,
      tone,
      depth,
      location,
      includeTeReoLevel,
      includeKowhitiWhakapae,
      includeTapasa,
      pedagogyFocus,
      sourceStoryId,
      inputMethod,
      educatorNames,
      clarificationAnswers,
      demo,
    } = body;

    if (!observations || observations.trim().length < 10) {
      return NextResponse.json({ error: "Please add a few observations (at least 10 characters)" }, { status: 400 });
    }

    // DEMO MODE — public, rate limited per IP
    if (demo) {
      const demoFramework = normalizeFramework(typeof location === "string" ? location : undefined);
      const demoChildName = typeof childName === "string" && childName.trim()
        ? childName.trim()
        : inferPrimaryChildName(observations);
      const demoClarificationAnswers = normalizeClarificationAnswers(clarificationAnswers);
      const demoClarification = demoClarificationAnswers.length === 0
        ? getStoryClarification({ observations, childName: demoChildName })
        : { needsClarification: false, kind: "ready" as const, reason: "", questions: [] };
      if (demoClarification.needsClarification) {
        return NextResponse.json({
          needsClarification: true,
          clarificationKind: demoClarification.kind,
          clarificationReason: demoClarification.reason,
          clarificationQuestions: demoClarification.questions,
          framework: demoFramework,
        });
      }

      const ip = getClientIp(request);
      const allowed = await consumeRateLimit({
        scope: "public-demo",
        key: ip,
        limit: 2,
        windowSeconds: 60 * 60,
      });
      if (!allowed) {
        return NextResponse.json({ error: "Demo limit reached. Sign up to keep going — it's free." }, { status: 429 });
      }
      const demoTeReoLevel = demoFramework === "NZ"
        ? normalizeTeReoLevel(typeof includeTeReoLevel === "string" ? includeTeReoLevel : undefined)
        : "low";
      const demoIncludeKowhiti = demoFramework === "NZ" ? Boolean(includeKowhitiWhakapae) : false;
      const demoGenerationObservations = buildGenerationObservations(observations, demoClarificationAnswers);
      const result = await generateLearningStory({
        observations: demoGenerationObservations,
        ageGroup,
        childName: demoChildName,
        framework: demoFramework,
        tone: normalizeTone(typeof tone === "string" ? tone : undefined),
        depth: normalizeDepth(typeof depth === "string" ? depth : undefined),
        includeTeReoLevel: demoTeReoLevel,
        includeKowhitiWhakapae: demoIncludeKowhiti,
        includeTapasa: Boolean(includeTapasa),
        pedagogyFocus: normalizePedagogyFocus(typeof pedagogyFocus === "string" ? pedagogyFocus : undefined),
        educatorNames: normalizeEducatorNames(educatorNames),
      });
      return NextResponse.json({
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
      });
    }

    // AUTHENTICATED MODE
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to generate stories" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Your account has been disabled. Contact support." }, { status: 403 });
    }
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    const plan = profile.plan ?? "free";
    const used = profile.stories_this_month ?? 0;
    const preferences = mergeStoryPreferences(sanitizeStoryPreferences(profile.story_preferences));
    const framework = normalizeFramework(
      typeof location === "string" ? location : preferences.defaultFramework
    );
    const resolvedTone = normalizeTone(typeof tone === "string" ? tone : preferences.preferredTone);
    const resolvedDepth = normalizeDepth(typeof depth === "string" ? depth : preferences.depthPreference);
    const resolvedTeReoLevel = framework === "NZ"
      ? normalizeTeReoLevel(typeof includeTeReoLevel === "string" ? includeTeReoLevel : preferences.includeTeReoLevel)
      : "low";
    const resolvedIncludeKowhiti =
      framework === "NZ"
        ? typeof includeKowhitiWhakapae === "boolean"
          ? includeKowhitiWhakapae
          : preferences.includeKowhitiWhakapae ?? false
        : false;
    const resolvedIncludeTapasa =
      typeof includeTapasa === "boolean"
        ? includeTapasa
        : preferences.includeTapasa ?? false;
    const resolvedPedagogyFocus = normalizePedagogyFocus(
      typeof pedagogyFocus === "string" ? pedagogyFocus : preferences.pedagogyFocus
    );
    const resolvedInputMethod = normalizeInputMethod(inputMethod);
    const requestPreferences = mergeStoryPreferences(preferences, {
      defaultFramework: framework,
      preferredTone: resolvedTone,
      depthPreference: resolvedDepth,
      includeTeReoLevel: resolvedTeReoLevel,
      includeKowhitiWhakapae: resolvedIncludeKowhiti,
      includeTapasa: resolvedIncludeTapasa,
      pedagogyFocus: resolvedPedagogyFocus,
    });
    const limit = getMonthlyStoryLimit(profile);

    if (limit !== null && used >= limit) {
      return NextResponse.json({
        error: plan === "free"
          ? profile.applied_access_code
            ? `You've used your ${limit} complimentary stories this month.`
            : "You've used your 3 free stories this month. Upgrade for unlimited."
          : "Monthly limit reached.",
        upgradeRequired: plan === "free",
      }, { status: 403 });
    }

    const selectedChildId = typeof childId === "string" ? childId : "";
    const { data: selectedChild } = selectedChildId
      ? await supabase
          .from("child_profiles")
          .select("id, name, age_group, interests, developmental_focus, notes, whanau_aspirations, home_languages")
          .eq("id", selectedChildId)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    if (selectedChildId && !selectedChild) {
      return NextResponse.json({ error: "Selected child profile was not found" }, { status: 404 });
    }

    const { data: recentChildStories } = selectedChild
      ? await supabase
          .from("stories")
          .select("metadata, outcomes, next_steps, created_at")
          .eq("user_id", user.id)
          .eq("child_id", selectedChild.id)
          .order("created_at", { ascending: false })
          .limit(3)
      : { data: [] };

    const recentLearning = (recentChildStories ?? [])
      .map((story) => {
        const metadata =
          story.metadata && typeof story.metadata === "object"
            ? (story.metadata as Record<string, unknown>)
            : {};
        const summary = typeof metadata.learningSummary === "string" ? metadata.learningSummary : "";
        const reflection = typeof metadata.educatorReflection === "string" ? metadata.educatorReflection : "";
        const whanauVoice = typeof metadata.whanauVoice === "string" ? metadata.whanauVoice : "";
        return [summary, reflection, whanauVoice].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .slice(0, 3);

    const submittedChildName = typeof childName === "string" && childName.trim() ? childName.trim() : "";
    const resolvedChildName = selectedChild?.name?.trim() || submittedChildName || inferPrimaryChildName(observations);
    const resolvedAgeGroup = selectedChild?.age_group ?? ageGroup;
    const resolvedEducatorNames = normalizeEducatorNames(educatorNames);
    const resolvedClarificationAnswers = normalizeClarificationAnswers(clarificationAnswers);
    const clarification = resolvedClarificationAnswers.length === 0
      ? getStoryClarification({ observations, childName: resolvedChildName })
      : { needsClarification: false, kind: "ready" as const, reason: "", questions: [] };
    if (clarification.needsClarification) {
      return NextResponse.json({
        success: false,
        needsClarification: true,
        clarificationKind: clarification.kind,
        clarificationReason: clarification.reason,
        clarificationQuestions: clarification.questions,
        plan,
        storiesUsedThisMonth: used,
        monthlyStoryLimit: limit,
        appliedAccessCode: profile.applied_access_code,
        remaining:
          limit === null
            ? "unlimited"
            : getRemainingStories(profile),
      });
    }
    const generationObservations = buildGenerationObservations(observations, resolvedClarificationAnswers);
    const canUseChildContinuity = hasFeatureAccess(plan, "childContinuityProfiles");
    const childContext = selectedChild && canUseChildContinuity
      ? [
          selectedChild.interests?.length ? `Current interests: ${selectedChild.interests.join(", ")}` : "",
          selectedChild.developmental_focus ? `Educator learning focus: ${selectedChild.developmental_focus}` : "",
          selectedChild.whanau_aspirations
            ? `${framework === "NZ" ? "Whānau" : "Family"} aspirations: ${selectedChild.whanau_aspirations}`
            : "",
          selectedChild.home_languages?.length ? `Home languages: ${selectedChild.home_languages.join(", ")}` : "",
          selectedChild.notes ? `Educator context: ${selectedChild.notes}` : "",
          recentLearning.length ? `Recent learning summaries: ${recentLearning.join(" | ")}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const result = await generateLearningStory({
      observations: generationObservations,
      ageGroup: resolvedAgeGroup,
      childName: resolvedChildName,
      tone: resolvedTone,
      depth: resolvedDepth,
      framework,
      includeTeReoLevel: resolvedTeReoLevel,
      includeKowhitiWhakapae: resolvedIncludeKowhiti,
      includeTapasa: resolvedIncludeTapasa,
      pedagogyFocus: resolvedPedagogyFocus,
      childContext,
      preferences: requestPreferences,
      educatorNames: resolvedEducatorNames,
    });

    // Save to history
    const { data: saved } = await supabase.from("stories").insert({
      user_id: user.id,
      child_id: selectedChild?.id ?? null,
      observations: observations.slice(0, 2000),
      story_text: result.story,
      outcomes: result.outcomes,
      next_steps: result.nextSteps,
      age_group: resolvedAgeGroup ?? result.childAge,
      child_name: resolvedChildName,
      tone: resolvedTone,
      location: framework,
      word_count: result.wordCount,
      metadata: {
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
        inputMethod: resolvedInputMethod,
        educatorNames: resolvedEducatorNames,
        clarificationAnswers: resolvedClarificationAnswers,
        followUpStatus: "open",
        continuityContextUsed: Boolean(selectedChild && canUseChildContinuity),
        sourceStoryId: typeof sourceStoryId === "string" ? sourceStoryId : undefined,
        nextStepProgress: result.nextSteps.map((text) => ({ text, status: "planned" })),
        storySettings: {
          framework,
          tone: resolvedTone,
          depth: resolvedDepth,
          includeTeReoLevel: resolvedTeReoLevel,
          includeKowhitiWhakapae: resolvedIncludeKowhiti,
          includeTapasa: resolvedIncludeTapasa,
          pedagogyFocus: resolvedPedagogyFocus,
          educatorNames: resolvedEducatorNames,
          clarificationAnswers: resolvedClarificationAnswers,
        },
      },
    }).select("id").single();

    // Increment usage
    const now = new Date().toISOString();
    const newStoriesThisMonth = used + 1;
    const profileUpdate: Record<string, unknown> = {
      stories_this_month: newStoriesThisMonth,
      total_stories: (profile.total_stories ?? 0) + 1,
      last_story_at: now,
    };
    if ((profile.total_stories ?? 0) === 0) {
      profileUpdate.first_story_created_at = now;
    }

    await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    await sendStoryMilestoneEmails({
      profile,
      storyId: saved?.id,
      storiesUsedThisMonth: newStoriesThisMonth,
    }).catch((emailError) => {
      console.error("Story milestone email error:", emailError);
    });

    return NextResponse.json({
      success: true,
      storyId: saved?.id,
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
      plan,
      storiesUsedThisMonth: newStoriesThisMonth,
      monthlyStoryLimit: limit,
      appliedAccessCode: profile.applied_access_code,
      remaining:
        limit === null
          ? "unlimited"
          : getRemainingStories({ ...profile, stories_this_month: newStoriesThisMonth }),
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate story. Please try again.",
    }, { status: 500 });
  }
}
