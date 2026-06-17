import { NextRequest, NextResponse } from "next/server";

import { generateParentFriendlyVersion } from "@/lib/ai/generate";
import { createClient } from "@/lib/supabase/server";
import { normalizeFramework } from "@/lib/story-options";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Sign in to create a parent version" }, { status: 401 });

    const { data: story, error } = await supabase
      .from("stories")
      .select("id, story_text, child_name, location, metadata")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const metadata = story.metadata && typeof story.metadata === "object"
      ? story.metadata as Record<string, unknown>
      : {};

    const parentVersion = await generateParentFriendlyVersion({
      story: story.story_text,
      childName: story.child_name,
      framework: normalizeFramework(story.location),
      learningSummary: typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
    });

    await supabase
      .from("stories")
      .update({
        metadata: {
          ...metadata,
          parentFriendlyVersion: parentVersion,
          parentFriendlyGeneratedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ parentVersion });
  } catch (error) {
    console.error("Parent version error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create parent-friendly version" },
      { status: 500 }
    );
  }
}
