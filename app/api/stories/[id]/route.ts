import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isMissingUpdatedAtColumn(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("updated_at")
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const story = typeof body.story === "string" ? body.story.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    if (story.length < 20) {
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
    const updatePayload = {
      story_text: story,
      word_count: story.split(/\s+/).filter(Boolean).length,
      metadata: {
        ...existingMetadata,
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
      const { updated_at: _updatedAt, ...fallbackPayload } = updatePayload;
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

    return NextResponse.json({ success: true, storyId: data.id, story: data.story_text, updatedAt: data.updated_at });
  } catch (error) {
    console.error("Story update error:", error);
    return NextResponse.json({ error: "Could not save story edits" }, { status: 500 });
  }
}
