import { NextRequest, NextResponse } from "next/server";

import { generateFamilyConnectionPack } from "@/lib/ai/generate";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess, requiredPlanForFeature } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { normalizeFramework } from "@/lib/story-options";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to create a family pack" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    if (!hasFeatureAccess(profile.plan, "familyConnectionPack")) {
      return NextResponse.json({
        error: "Family Connection Pack is available on Educator and Centre plans.",
        upgradeRequired: true,
        requiredPlan: requiredPlanForFeature("familyConnectionPack"),
      }, { status: 403 });
    }

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, story_text, child_name, location, metadata, next_steps")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const metadata = story.metadata && typeof story.metadata === "object"
      ? story.metadata as Record<string, unknown>
      : {};

    const familyPack = await generateFamilyConnectionPack({
      story: story.story_text,
      childName: story.child_name,
      framework: normalizeFramework(story.location),
      learningSummary: typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
      familyQuestion: typeof metadata.familyQuestion === "string" ? metadata.familyQuestion : "",
      nextSteps: Array.isArray(story.next_steps) ? story.next_steps.filter((item): item is string => typeof item === "string") : [],
    });

    await supabase
      .from("stories")
      .update({
        metadata: {
          ...metadata,
          familyConnectionPack: familyPack,
          familyConnectionPackGeneratedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ familyPack });
  } catch (error) {
    console.error("Family pack error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create family connection pack" },
      { status: 500 }
    );
  }
}
