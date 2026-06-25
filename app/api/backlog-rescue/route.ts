import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

import { analyzeBacklogRescue } from "@/lib/ai/generate";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess, requiredPlanForFeature } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { mergeStoryPreferences, normalizeFramework, sanitizeStoryPreferences } from "@/lib/story-options";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to use Backlog Rescue" }, { status: 401 });

    const body = await request.json();
    const observations = typeof body.observations === "string" ? body.observations.trim() : "";
    const framework = normalizeFramework(typeof body.framework === "string" ? body.framework : undefined);

    if (observations.length < 40) {
      return NextResponse.json(
        { error: "Paste a few observations from the week so Backlog Rescue has enough to sort." },
        { status: 400 }
      );
    }

    const profile = await getOrCreateProfile(user);
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    if (!hasFeatureAccess(profile.plan, "backlogRescue")) {
      return NextResponse.json({
        error: "Backlog Rescue is available on Educator and Centre plans.",
        upgradeRequired: true,
        requiredPlan: requiredPlanForFeature("backlogRescue"),
      }, { status: 403 });
    }

    const allowed = await consumeRateLimit({
      scope: "backlog-rescue",
      key: user.id,
      limit: 8,
      windowSeconds: 60 * 60,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Backlog Rescue is cooling down. Try again in a little while." }, { status: 429 });
    }

    const result = await analyzeBacklogRescue({
      observations,
      framework,
      preferences: mergeStoryPreferences(sanitizeStoryPreferences(profile.story_preferences)),
    });

    return NextResponse.json({
      ...result,
      plan: profile.plan ?? "free",
      upgradeNudge: (profile.plan ?? "free") === "free",
    });
  } catch (error) {
    console.error("Backlog rescue error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not analyse backlog" },
      { status: 500 }
    );
  }
}
