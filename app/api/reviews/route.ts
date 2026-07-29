import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * An educator submits their own review. It lands as "pending" and is invisible
 * until the founder publishes it from admin, so nothing a visitor sees is ever
 * unmoderated.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to leave a review" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim().slice(0, 80) : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please choose a star rating." }, { status: 400 });
  }
  if (text.length < 10) {
    return NextResponse.json({ error: "Please write a little more so it is useful." }, { status: 400 });
  }

  // One submission per user per hour, so the form cannot be spammed.
  const allowed = await consumeRateLimit({ scope: "review", key: user.id, limit: 3, windowSeconds: 60 * 60 });
  if (!allowed) return NextResponse.json({ error: "Thanks, you have already sent a review recently." }, { status: 429 });

  const profile = await getOrCreateProfile(user);
  const admin = createAdminSupabase();
  const { error } = await admin.from("reviews").insert({
    user_id: user.id,
    reviewer_name: profile.full_name || user.email?.split("@")[0] || "An educator",
    reviewer_role: role,
    rating,
    body: text.slice(0, 1500),
    status: "pending",
  });

  if (error) {
    console.error("Review submit failed:", error.message);
    return NextResponse.json({ error: "Could not send your review. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
