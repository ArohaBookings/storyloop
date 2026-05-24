import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { mergeStoryPreferences, sanitizeStoryPreferences } from "@/lib/story-options";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to save story settings" }, { status: 401 });
    }

    const body = await request.json();
    const profile = await getOrCreateProfile(user);
    const preferences = mergeStoryPreferences(
      sanitizeStoryPreferences(profile.story_preferences),
      sanitizeStoryPreferences(body)
    );

    const { data, error } = await supabase
      .from("profiles")
      .update({ story_preferences: preferences })
      .eq("id", user.id)
      .select("story_preferences")
      .single();

    if (error) {
      return NextResponse.json({ error: "Could not save story settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data.story_preferences });
  } catch (error) {
    console.error("Preference save error:", error);
    return NextResponse.json({ error: "Could not save story settings" }, { status: 500 });
  }
}
