import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const { data, error } = await supabase
      .from("stories")
      .update({
        story_text: story,
        word_count: story.split(/\s+/).filter(Boolean).length,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, story_text")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Story not found or not editable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, storyId: data.id, story: data.story_text });
  } catch (error) {
    console.error("Story update error:", error);
    return NextResponse.json({ error: "Could not save story edits" }, { status: 500 });
  }
}
