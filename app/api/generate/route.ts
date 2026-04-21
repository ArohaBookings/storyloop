import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLearningStory } from "@/lib/ai/generate";

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

const PLAN_LIMITS: Record<string, number> = {
  free: 3, educator: 99999, centre: 99999,
};

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
      const result = await generateLearningStory({ observations, ageGroup, location });
      return NextResponse.json({ story: result.story, outcomes: result.outcomes, nextSteps: result.nextSteps });
    }

    // AUTHENTICATED MODE
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to generate stories" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, stories_this_month, subscription_status")
      .eq("id", user.id)
      .single();

    const plan = profile?.plan ?? "free";
    const used = profile?.stories_this_month ?? 0;
    const limit = PLAN_LIMITS[plan] ?? 3;

    if (used >= limit) {
      return NextResponse.json({
        error: plan === "free"
          ? "You've used your 3 free stories this month. Upgrade for unlimited."
          : "Monthly limit reached.",
        upgradeRequired: plan === "free",
      }, { status: 403 });
    }

    const result = await generateLearningStory({ observations, ageGroup, childName, tone, location });

    // Save to history
    const { data: saved } = await supabase.from("stories").insert({
      user_id: user.id,
      observations: observations.slice(0, 2000),
      story_text: result.story,
      outcomes: result.outcomes,
      next_steps: result.nextSteps,
      age_group: ageGroup ?? result.childAge,
      child_name: childName,
      tone: tone ?? "warm",
      location: location ?? "AU",
      word_count: result.wordCount,
    }).select("id").single();

    // Increment usage
    await supabase.from("profiles").update({ stories_this_month: used + 1 }).eq("id", user.id);

    return NextResponse.json({
      success: true,
      storyId: saved?.id,
      story: result.story,
      outcomes: result.outcomes,
      nextSteps: result.nextSteps,
      remaining: limit === 99999 ? "unlimited" : limit - used - 1,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate story. Please try again.",
    }, { status: 500 });
  }
}
