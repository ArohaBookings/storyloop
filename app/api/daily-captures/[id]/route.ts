import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DailyCaptureStatus } from "@/lib/today-loop";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CAPTURE_SELECT =
  "id, child_id, child_name, note, status, observed_at, created_at, updated_at";
const STATUSES = new Set<DailyCaptureStatus>(["captured", "planned", "story_ready", "archived"]);

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view this moment" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("daily_captures")
    .select(CAPTURE_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Captured moment not found" }, { status: 404 });
  }

  return NextResponse.json({ capture: data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" && STATUSES.has(body.status as DailyCaptureStatus)
    ? body.status as DailyCaptureStatus
    : null;

  if (!status) {
    return NextResponse.json({ error: "Choose a valid Today Loop action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to update this moment" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("daily_captures")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(CAPTURE_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Captured moment not found" }, { status: 404 });
  }

  return NextResponse.json({ capture: data });
}
