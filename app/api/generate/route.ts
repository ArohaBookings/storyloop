import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLearningStory } from "@/lib/ai/generate";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMonthlyStoryLimit, getRemainingStories } from "@/lib/story-limits";
import { mergeStoryPreferences, normalizeFramework, normalizeTone } from "@/lib/story-options";

// In-memory rate limit for demo mode (per-IP)
const demoRateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

function checkDemoRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = demoRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    demoRateLimit.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour
    return true;
  }
  if (entry.count >= 2) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { observations, ageGroup, childName, tone, location, demo } = body;

    if (!observations || observations.trim().length < 10) {
      return NextResponse.json({ error: "Please add a few observations (at least 10 characters)" }, { status: 400 });
    }

    // DEMO MODE — public, rate limited per IP
    if (demo) {
      const ip = getClientIp(request);
      if (!checkDemoRateLimit(ip)) {
        return NextResponse.json({ error: "Demo limit reached. Sign up to keep going — it's free." }, { status: 429 });
      }
      const result = await generateLearningStory({
        observations,
        ageGroup,
        framework: normalizeFramework(typeof location === "string" ? location : undefined),
      });
      return NextResponse.json({
        story: result.story,
        outcomes: result.outcomes,
        learningSummary: result.learningSummary,
        learningDispositions: result.learningDispositions,
        socialEmotionalLinks: result.socialEmotionalLinks,
        culturalConnections: result.culturalConnections,
        whanauConnection: result.whanauConnection,
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

    const plan = profile.plan ?? "free";
    const used = profile.stories_this_month ?? 0;
    const preferences = mergeStoryPreferences(profile.story_preferences);
    const framework = normalizeFramework(
      typeof location === "string" ? location : preferences.defaultFramework
    );
    const resolvedTone = normalizeTone(typeof tone === "string" ? tone : preferences.preferredTone);
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

    const result = await generateLearningStory({
      observations,
      ageGroup,
      childName,
      tone: resolvedTone,
      framework,
      preferences,
    });

    // Save to history
    const { data: saved } = await supabase.from("stories").insert({
      user_id: user.id,
      observations: observations.slice(0, 2000),
      story_text: result.story,
      outcomes: result.outcomes,
      next_steps: result.nextSteps,
      age_group: ageGroup ?? result.childAge,
      child_name: childName,
      tone: resolvedTone,
      location: framework,
      word_count: result.wordCount,
      metadata: {
        learningSummary: result.learningSummary,
        learningDispositions: result.learningDispositions,
        socialEmotionalLinks: result.socialEmotionalLinks,
        culturalConnections: result.culturalConnections,
        whanauConnection: result.whanauConnection,
      },
    }).select("id").single();

    // Increment usage
    await supabase
      .from("profiles")
      .update({
        stories_this_month: used + 1,
        total_stories: (profile.total_stories ?? 0) + 1,
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      storyId: saved?.id,
      story: result.story,
      outcomes: result.outcomes,
      learningSummary: result.learningSummary,
      learningDispositions: result.learningDispositions,
      socialEmotionalLinks: result.socialEmotionalLinks,
      culturalConnections: result.culturalConnections,
      whanauConnection: result.whanauConnection,
      nextSteps: result.nextSteps,
      plan,
      storiesUsedThisMonth: used + 1,
      monthlyStoryLimit: limit,
      appliedAccessCode: profile.applied_access_code,
      remaining:
        limit === null
          ? "unlimited"
          : getRemainingStories({ ...profile, stories_this_month: used + 1 }),
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate story. Please try again.",
    }, { status: 500 });
  }
}
