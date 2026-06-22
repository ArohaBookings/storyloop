import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";

const VALID_CATEGORIES = new Set([
  "story_quality",
  "feature_request",
  "bug",
  "billing",
  "centre_rollout",
  "mobile",
  "other",
]);

function normalizeCategory(value: unknown) {
  return typeof value === "string" && VALID_CATEGORIES.has(value) ? value : "other";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to send feedback" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    const body = await request.json();
    const rawMessage = typeof body.message === "string" ? body.message : "";
    const page = typeof body.page === "string" ? body.page.slice(0, 240) : null;
    const message = rawMessage.slice(0, 5000);

    if (message.trim().length < 3) {
      return NextResponse.json({ error: "Please write a little more feedback before sending." }, { status: 400 });
    }

    const { error } = await supabase.from("feedback_submissions").insert({
      user_id: user.id,
      email: user.email ?? profile.email,
      category: normalizeCategory(body.category),
      page,
      message,
      metadata: {
        plan: profile.plan ?? "free",
        subscription_status: profile.subscription_status ?? "free",
        stories_this_month: profile.stories_this_month ?? 0,
        total_stories: profile.total_stories ?? 0,
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send feedback" },
      { status: 500 }
    );
  }
}
