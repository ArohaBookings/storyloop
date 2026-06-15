import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitiseShortText, sanitiseStringList } from "@/lib/children";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CHILD_SELECT =
  "id, name, age_group, interests, developmental_focus, notes, whanau_aspirations, home_languages, created_at, updated_at";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to edit child profiles" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = sanitiseShortText(body.name, 80);
  if (!name) {
    return NextResponse.json({ error: "Add the child's preferred name or label" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("child_profiles")
    .update({
      name,
      age_group: sanitiseShortText(body.ageGroup, 40) || null,
      interests: sanitiseStringList(body.interests),
      developmental_focus: sanitiseShortText(body.developmentalFocus, 500) || null,
      notes: sanitiseShortText(body.notes, 1000) || null,
      whanau_aspirations: sanitiseShortText(body.whanauAspirations, 1000) || null,
      home_languages: sanitiseStringList(body.homeLanguages, 8),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(CHILD_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Child profile not found" }, { status: 404 });
  }

  return NextResponse.json({ child: data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to delete child profiles" }, { status: 401 });
  }

  const { error } = await supabase
    .from("child_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete child profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
