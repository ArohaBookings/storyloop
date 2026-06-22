import { NextRequest, NextResponse } from "next/server";

import { generateFamilyTranslationPack } from "@/lib/ai/generate";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess, requiredPlanForFeature } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const language =
      typeof body.language === "string" && body.language.trim()
        ? body.language.trim().slice(0, 60)
        : "plain English";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to create a family translation" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    if (!hasFeatureAccess(profile.plan, "translationReadability")) {
      return NextResponse.json({
        error: "Family translation and readability tools are available on Educator Pro and Centre plans.",
        upgradeRequired: true,
        requiredPlan: requiredPlanForFeature("translationReadability"),
      }, { status: 403 });
    }

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, story_text, child_name, metadata")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const metadata = story.metadata && typeof story.metadata === "object"
      ? story.metadata as Record<string, unknown>
      : {};
    const parentVersion = typeof metadata.parentFriendlyVersion === "string" ? metadata.parentFriendlyVersion : "";
    const translationPack = await generateFamilyTranslationPack({
      story: story.story_text,
      parentVersion,
      language,
      childName: story.child_name,
    });
    const updatedAt = new Date().toISOString();

    await supabase
      .from("stories")
      .update({
        metadata: {
          ...metadata,
          familyTranslationPack: translationPack,
          familyTranslationGeneratedAt: updatedAt,
        },
        updated_at: updatedAt,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ translationPack });
  } catch (error) {
    console.error("Family translation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create family translation" },
      { status: 500 }
    );
  }
}
