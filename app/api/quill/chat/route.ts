import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { isBillingBlocked, billingBlockPayload } from "@/lib/billing-access";
import { hasFeatureAccess, normalizePlanKey, EDUCATOR_ASSISTANT_MONTHLY } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { chatWithQuill, type QuillChatTurn } from "@/lib/ai/assistant";
import { normalizeFramework } from "@/lib/story-options";

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const story = typeof body.story === "string" ? body.story : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const selection = typeof body.selection === "string" ? body.selection.trim() : "";
    const storyId = typeof body.storyId === "string" && body.storyId ? body.storyId : null;
    const childId = typeof body.childId === "string" && body.childId ? body.childId : null;
    const history: QuillChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter((m: unknown): m is QuillChatTurn => Boolean(m) && (((m as QuillChatTurn).role === "user") || ((m as QuillChatTurn).role === "assistant")) && typeof (m as QuillChatTurn).content === "string")
          .slice(-6)
      : [];

    if (story.trim().length < 20) return NextResponse.json({ error: "There's no story to talk about yet." }, { status: 400 });
    if (message.length < 1) return NextResponse.json({ error: "Ask Quill something." }, { status: 400 });

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

    const allowed = await consumeRateLimit({ scope: "quill-chat", key: user.id, limit: 60, windowSeconds: 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "Quill is catching its breath. Try again in a moment." }, { status: 429 });

    const admin = createAdminSupabase();

    // Pull a little continuity context from this child's recent stories.
    let childContext = "";
    let childName: string | null = typeof body.childName === "string" ? body.childName : null;
    if (childId) {
      const { data: child } = await admin
        .from("child_profiles")
        .select("name, age_group, interests")
        .eq("id", childId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (child) {
        childName = childName || child.name;
        const { data: recent } = await admin
          .from("stories")
          .select("metadata, created_at")
          .eq("user_id", user.id)
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(3);
        const summaries = (recent ?? [])
          .map((s) => (s.metadata && typeof s.metadata === "object" ? (s.metadata as Record<string, unknown>).learningSummary : ""))
          .filter((t): t is string => typeof t === "string" && t.length > 0);
        childContext = [
          child.interests?.length ? `Interests: ${child.interests.join(", ")}` : "",
          summaries.length ? `Recent learning: ${summaries.join(" | ")}` : "",
        ].filter(Boolean).join("\n");
      }
    }

    const framework = normalizeFramework(typeof body.framework === "string" ? body.framework : undefined);
    const result = await chatWithQuill({ story, message, history, selection, framework, childName, childContext });

    // If Quill proposed a change, respect the monthly cap for Educator (Pro is
    // unlimited). Advice always flows; only edits are capped.
    let edit = result.edit;
    let editId: string | null = null;
    let upgradeRequired = false;
    if (edit) {
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
      }
      if (capped && used >= EDUCATOR_ASSISTANT_MONTHLY) {
        edit = null;
        upgradeRequired = true;
      } else {
        const { data: inserted } = await admin
          .from("assistant_edits")
          .insert({
            user_id: user.id,
            story_id: storyId,
            instruction: message.slice(0, 500),
            before_text: selection.slice(0, 2000) || null,
            change_summary: edit.summary,
            accepted: false,
          })
          .select("id")
          .single();
        editId = inserted?.id ?? null;
      }
    }

    return NextResponse.json({
      reply: upgradeRequired
        ? `${result.reply}\n\nYou've used your ${EDUCATOR_ASSISTANT_MONTHLY} Quill edits this month. Educator Pro makes Quill unlimited.`
        : result.reply,
      edit: edit ? { story: edit.story, summary: edit.summary } : null,
      editId,
      upgradeRequired,
    });
  } catch (error) {
    console.error("Quill chat error:", error);
    return NextResponse.json({ error: "Quill couldn't respond. Try again in a moment." }, { status: 500 });
  }
}
