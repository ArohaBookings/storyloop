import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessProfile } from "@/lib/supabase/profiles";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await getAccessProfile(user);
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    // When the account was made, for the first-session events (a time, never anything typed).
    return NextResponse.json({ profile, signedUpAt: user.created_at ?? null });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
