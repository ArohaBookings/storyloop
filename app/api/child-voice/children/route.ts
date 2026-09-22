import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";

/** The educator's children, with whether each family has agreed to voice notes. */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "childVoice")) {
    return NextResponse.json({ error: "Children's own words is on paid plans." }, { status: 403 });
  }

  const { data } = await supabase
    .from("child_profiles")
    .select("id, name, voice_consent_at")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json({ children: data ?? [] });
}
