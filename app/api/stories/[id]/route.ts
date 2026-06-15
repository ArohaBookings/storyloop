import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to view stories" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("stories")
      .select("id, child_id, child_name, age_group, observations, story_text, next_steps, metadata, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json({ story: data });
  } catch (error) {
    console.error("Story fetch error:", error);
    return NextResponse.json({ error: "Could not load story" }, { status: 500 });
  }
}

function isMissingUpdatedAtColumn(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("updated_at")
  );
}

const NEXT_STEP_STATUSES = new Set(["planned", "tried", "continue"]);

function sanitiseNextStepProgress(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const text = typeof item.text === "string" ? item.text.trim().slice(0, 500) : "";
    const status = typeof item.status === "string" && NEXT_STEP_STATUSES.has(item.status)
      ? item.status
      : "planned";
    const note = typeof item.note === "string" ? item.note.trim().slice(0, 500) : "";
    return text ? [{ text, status, ...(note ? { note } : {}) }] : [];
  });
}

function sanitiseReviewChecklist(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const checklist = value as Record<string, unknown>;
  return {
    evidence: checklist.evidence === true,
    childVoice: checklist.childVoice === true,
    curriculum: checklist.curriculum === true,
    culture: checklist.culture === true,
    privacy: checklist.privacy === true,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const story = typeof body.story === "string" ? body.story.trim() : "";
    const educatorReflection =
      typeof body.educatorReflection === "string" ? body.educatorReflection.trim().slice(0, 2000) : undefined;
    const followUpStatus =
      body.followUpStatus === "revisited" || body.followUpStatus === "open"
        ? body.followUpStatus
        : undefined;
    const whanauVoice =
      typeof body.whanauVoice === "string" ? body.whanauVoice.trim().slice(0, 2000) : undefined;
    const nextStepProgress = sanitiseNextStepProgress(body.nextStepProgress);
    const reviewChecklist = sanitiseReviewChecklist(body.reviewChecklist);
    const markReviewed = body.markReviewed === true;

    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    if (story && story.length < 20) {
      return NextResponse.json({ error: "Story must be at least 20 characters" }, { status: 400 });
    }

    if (story.length > 8000) {
      return NextResponse.json({ error: "Story is too long to save" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to edit stories" }, { status: 401 });
    }

    const { data: existingStory } = await supabase
      .from("stories")
      .select("metadata")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    const existingMetadata =
      existingStory?.metadata && typeof existingStory.metadata === "object"
        ? (existingStory.metadata as Record<string, unknown>)
        : {};
    const updatedAt = new Date().toISOString();
    const reviewComplete = reviewChecklist
      ? Object.values(reviewChecklist).every(Boolean)
      : false;

    if (markReviewed && !reviewComplete) {
      return NextResponse.json(
        { error: "Complete all educator review checks before marking this story reviewed." },
        { status: 400 }
      );
    }

    const nextStoryText = story || undefined;
    const updatePayload = {
      ...(nextStoryText
        ? {
            story_text: nextStoryText,
            word_count: nextStoryText.split(/\s+/).filter(Boolean).length,
          }
        : {}),
      metadata: {
        ...existingMetadata,
        ...(educatorReflection !== undefined ? { educatorReflection } : {}),
        ...(followUpStatus ? { followUpStatus } : {}),
        ...(whanauVoice !== undefined
          ? {
              whanauVoice,
              whanauCapturedAt: whanauVoice ? updatedAt : null,
            }
          : {}),
        ...(nextStepProgress ? { nextStepProgress } : {}),
        ...(reviewChecklist
          ? {
              reviewChecklist,
              reviewedAt: markReviewed ? updatedAt : null,
            }
          : {}),
        editedAt: updatedAt,
      },
      updated_at: updatedAt,
    };

    let { data, error } = await supabase
      .from("stories")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, story_text, updated_at")
      .single();

    if (isMissingUpdatedAtColumn(error)) {
      const fallbackPayload: Record<string, unknown> = { ...updatePayload };
      delete fallbackPayload.updated_at;
      const fallback = await supabase
        .from("stories")
        .update(fallbackPayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, story_text, metadata")
        .single();
      data = fallback.data ? { ...fallback.data, updated_at: updatedAt } : null;
      error = fallback.error;
    }

    if (error || !data) {
      return NextResponse.json({ error: "Story not found or not editable" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      storyId: data.id,
      story: data.story_text,
      updatedAt: data.updated_at,
      educatorReflection,
      followUpStatus,
      whanauVoice,
      nextStepProgress,
      reviewChecklist,
      reviewedAt: reviewChecklist && markReviewed ? updatedAt : undefined,
    });
  } catch (error) {
    console.error("Story update error:", error);
    return NextResponse.json({ error: "Could not save story edits" }, { status: 500 });
  }
}
