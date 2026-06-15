import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitiseShortText, sanitiseStringList } from "@/lib/children";

const CHILD_SELECT =
  "id, name, age_group, interests, developmental_focus, notes, whanau_aspirations, home_languages, created_at, updated_at";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view child profiles" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .select(CHILD_SELECT)
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Could not load child profiles" }, { status: 500 });
  }

  return NextResponse.json({ children: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to create child profiles" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = sanitiseShortText(body.name, 80);
  if (!name) {
    return NextResponse.json({ error: "Add the child's preferred name or label" }, { status: 400 });
  }

  const { count } = await supabase
    .from("child_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 100) {
    return NextResponse.json({ error: "Child profile limit reached" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("child_profiles")
    .insert({
      user_id: user.id,
      name,
      age_group: sanitiseShortText(body.ageGroup, 40) || null,
      interests: sanitiseStringList(body.interests),
      developmental_focus: sanitiseShortText(body.developmentalFocus, 500) || null,
      notes: sanitiseShortText(body.notes, 1000) || null,
      whanau_aspirations: sanitiseShortText(body.whanauAspirations, 1000) || null,
      home_languages: sanitiseStringList(body.homeLanguages, 8),
      updated_at: now,
    })
    .select(CHILD_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create child profile" }, { status: 500 });
  }

  return NextResponse.json({ child: data }, { status: 201 });
}
