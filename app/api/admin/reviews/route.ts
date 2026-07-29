import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

async function requireAdmin() {
  return Boolean(await verifyAdmin());
}

/** All reviews, newest first, for moderation. */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminSupabase()
    .from("reviews")
    .select("id, reviewer_name, reviewer_role, rating, body, status, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

/** Publish, hide, or delete a review. */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminSupabase();

  if (action === "delete") {
    const { error } = await admin.from("reviews").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "publish" || action === "hide") {
    const update =
      action === "publish"
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "hidden" };
    const { error } = await admin.from("reviews").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
