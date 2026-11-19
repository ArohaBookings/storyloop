import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { accountHasStories } from "@/lib/story-count";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getAccessProfile(user);
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    // Whether she has written a story, from the stories table when the counter
    // reads zero (fault P11: a few early accounts have stories and a zero
    // counter). Null when it could not be read: pages then fall back to the counter.
    const hasStories = await accountHasStories(createAdminSupabase(), user.id, profile.total_stories);
    // When the account was made, for the first-session events (a time, never anything typed).
    return NextResponse.json({ profile, signedUpAt: user.created_at ?? null, hasStories });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
