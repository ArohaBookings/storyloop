import { NextResponse } from "next/server";

import { generateRoomPlanningBrief } from "@/lib/ai/generate";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess, requiredPlanForFeature } from "@/lib/plans";
import { buildPlanningBoard } from "@/lib/planning-board";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { normalizeFramework } from "@/lib/story-options";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to create a planning brief" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    if (!hasFeatureAccess(profile.plan, "roomPlanningBrief")) {
      return NextResponse.json({
        error: "Room Planning Brief is available on the Centre plan.",
        upgradeRequired: true,
        requiredPlan: requiredPlanForFeature("roomPlanningBrief"),
      }, { status: 403 });
    }

    const [{ data: stories, error }, { data: children, error: childrenError }] = await Promise.all([
      supabase
      .from("stories")
      .select("id, child_id, child_name, story_text, outcomes, next_steps, metadata, location, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
      supabase
        .from("child_profiles")
        .select("id, name, age_group, interests")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (error) throw error;
    if (childrenError) throw childrenError;
    if (!stories?.length) {
      return NextResponse.json({ error: "Create at least one story before generating a planning brief." }, { status: 400 });
    }

    const dominantFramework = normalizeFramework(stories[0]?.location);
    const briefStories = stories.slice(0, 12);
    const brief = await generateRoomPlanningBrief({
      framework: dominantFramework,
      stories: briefStories.map((story) => {
        const metadata = asRecord(story.metadata);
        return {
          childName: story.child_name,
          storyText: story.story_text,
          learningSummary: typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
          nextSteps: Array.isArray(story.next_steps)
            ? story.next_steps.filter((item): item is string => typeof item === "string").slice(0, 4)
            : [],
          outcomes: Array.isArray(story.outcomes)
            ? story.outcomes.filter((item): item is string => typeof item === "string").slice(0, 4)
            : [],
          createdAt: story.created_at,
        };
      }),
    });
    const planningBoard = buildPlanningBoard(stories, children ?? []);

    return NextResponse.json({
      brief,
      planningBoard,
      storyCount: briefStories.length,
      framework: dominantFramework,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Team planning error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create planning brief" },
      { status: 500 }
    );
  }
}
