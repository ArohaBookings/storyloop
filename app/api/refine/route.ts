import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { isBillingBlocked, billingBlockPayload } from "@/lib/billing-access";
import { hasFeatureAccess, normalizePlanKey, EDUCATOR_ASSISTANT_MONTHLY } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { refineStorySection } from "@/lib/ai/assistant";
import { normalizeFramework } from "@/lib/story-options";

// Educator gets a monthly taste of Quill (EDUCATOR_ASSISTANT_MONTHLY); Educator
// Pro and centre plans are unlimited. The cap counts kept (accepted) edits.
function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const story = typeof body.story === "string" ? body.story : "";
    const selection = typeof body.selection === "string" ? body.selection.trim() : "";
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    const storyId = typeof body.storyId === "string" && body.storyId ? body.storyId : null;

    if (story.trim().length < 20) return NextResponse.json({ error: "There's no story to refine yet." }, { status: 400 });
    if (selection.length < 2) return NextResponse.json({ error: "Highlight the part you'd like Quill to change." }, { status: 400 });
    if (instruction.length < 2) return NextResponse.json({ error: "Tell Quill what to change." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to use Quill" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (isBillingBlocked(profile)) return NextResponse.json(billingBlockPayload(profile), { status: 402 });

    const plan = profile.plan ?? "free";
    if (!hasFeatureAccess(plan, "storyAssistant")) {
      return NextResponse.json(
        { error: "Quill is available on the Educator and Educator Pro plans.", upgradeRequired: true },
        { status: 403 }
      );
    }

    const allowed = await consumeRateLimit({ scope: "quill", key: user.id, limit: 40, windowSeconds: 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "Quill is catching its breath. Try again in a moment." }, { status: 429 });

    const admin = createAdminSupabase();
    const capped = normalizePlanKey(plan) === "educator";
    let used = 0;
    if (capped) {
      const { count } = await admin
        .from("assistant_edits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("accepted", true)
        .gte("created_at", monthStartIso());
      used = count ?? 0;
      if (used >= EDUCATOR_ASSISTANT_MONTHLY) {
        return NextResponse.json(
          {
            error: `You've used your ${EDUCATOR_ASSISTANT_MONTHLY} Quill edits this month. Educator Pro makes Quill unlimited.`,
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }
    }

    const childName = typeof body.childName === "string" ? body.childName : null;
    const framework = normalizeFramework(typeof body.framework === "string" ? body.framework : undefined);
    const result = await refineStorySection({ story, selection, instruction, framework, childName });

    const { data: inserted } = await admin
      .from("assistant_edits")
      .insert({
        user_id: user.id,
        story_id: storyId,
        instruction: instruction.slice(0, 500),
        before_text: selection.slice(0, 2000),
        change_summary: result.summary,
        accepted: false,
      })
      .select("id")
      .single();

    return NextResponse.json({
      editId: inserted?.id ?? null,
      story: result.story,
      summary: result.summary,
      quota: capped ? { used, limit: EDUCATOR_ASSISTANT_MONTHLY } : null,
    });
  } catch (error) {
    console.error("Quill refine error:", error);
    return NextResponse.json(
      { error: "Quill couldn't make that change. Try rewording your request." },
      { status: 500 }
    );
  }
}
