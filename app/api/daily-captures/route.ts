import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { monthStartIso, todayCaptureAllowance } from "@/lib/today-loop";

const CAPTURE_SELECT =
  "id, child_id, child_name, note, status, observed_at, created_at, updated_at";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view Today Loop" }, { status: 401 });
  }

  const profile = await getOrCreateProfile(user);
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("daily_captures")
      .select(CAPTURE_SELECT)
      .eq("user_id", user.id)
      .in("status", ["captured", "planned"])
      .order("observed_at", { ascending: false })
      .limit(100),
    supabase
      .from("daily_captures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStartIso()),
  ]);

  if (error) {
    return NextResponse.json({ error: "Could not load captured moments" }, { status: 500 });
  }

  return NextResponse.json({
    captures: data ?? [],
    allowance: todayCaptureAllowance(profile.plan, count ?? 0),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to capture a moment" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const childId = typeof body.childId === "string" ? body.childId.trim() : "";

  if (note.length < 10) {
    return NextResponse.json({ error: "Add one real detail before saving this moment." }, { status: 400 });
  }

  const profile = await getOrCreateProfile(user);
  const { count } = await supabase
    .from("daily_captures")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStartIso());
  const allowance = todayCaptureAllowance(profile.plan, count ?? 0);

  if (!allowance.allowed) {
    return NextResponse.json({
      error: "You have used this month's free Today Loop moments.",
      upgradeRequired: true,
      allowance,
    }, { status: 403 });
  }

  let childName: string | null = null;
  if (childId) {
    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, name")
      .eq("id", childId)
      .eq("user_id", user.id)
      .single();
    if (!child) {
      return NextResponse.json({ error: "That child profile is not available." }, { status: 400 });
    }
    childName = child.name;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("daily_captures")
    .insert({
      user_id: user.id,
      child_id: childId || null,
      child_name: childName,
      note,
      status: "captured",
      observed_at: now,
      updated_at: now,
    })
    .select(CAPTURE_SELECT)
    .single();

  if (error || !data) {
    console.error("Today Loop capture failed:", error?.message);
    return NextResponse.json({ error: "Could not save this moment. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    capture: data,
    allowance: todayCaptureAllowance(profile.plan, (count ?? 0) + 1),
  }, { status: 201 });
}
