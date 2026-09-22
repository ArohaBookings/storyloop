import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";

/**
 * The educator's recent stories, as a picker list. Titles and dates only: this
 * route never returns story text, because the picker does not need it and an
 * endpoint that returns less is an endpoint that can leak less.
 */
export const dynamic = "force-dynamic";

const RECENT = 40;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "wallCards")) {
    return NextResponse.json({ error: "Wall cards are on paid plans." }, { status: 403 });
  }

  const { data } = await supabase
    .from("stories")
    .select("id, created_at, child_name, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(RECENT);

  const stories = (data ?? []).map((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
    const title = typeof metadata.storyTitle === "string" && metadata.storyTitle.trim()
      ? metadata.storyTitle.trim()
      : `Story from ${String(row.created_at).slice(0, 10)}`;
    return { id: row.id as string, title, date: row.created_at as string };
  });

  return NextResponse.json({ stories });
}
