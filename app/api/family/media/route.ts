import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  CHILD_MEDIA_BUCKET,
  isFamilyPortalEnabled,
  listMediaForChild,
  mediaPath,
  recordMedia,
  userOwnsChild,
  validateUpload,
} from "@/lib/family-media";

export const maxDuration = 30;

/**
 * Family portal media, first slice: an educator attaches a photo or short video
 * to a child they own. Every entry point is behind the feature flag, so while
 * the portal ships dark this route returns 404 and can affect nobody.
 */

function offIfDisabled() {
  if (!isFamilyPortalEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const off = offIfDisabled();
  if (off) return off;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const childId = request.nextUrl.searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });
  if (!(await userOwnsChild(user.id, childId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const media = await listMediaForChild(user.id, childId);
  return NextResponse.json({ media });
}

export async function POST(request: NextRequest) {
  const off = offIfDisabled();
  if (off) return off;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const childId = typeof form?.get("childId") === "string" ? (form.get("childId") as string) : null;
  const caption = typeof form?.get("caption") === "string" ? (form.get("caption") as string).slice(0, 300) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  // A child may be attached, but if one is named it must belong to this user.
  if (childId && !(await userOwnsChild(user.id, childId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const validation = validateUpload(file.type, file.size);
  if (!validation.ok) return NextResponse.json({ error: validation.reason }, { status: 400 });

  const path = mediaPath(user.id, childId, file.name);
  const admin = createAdminSupabase();
  const { error: uploadError } = await admin.storage
    .from(CHILD_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Child media upload failed:", uploadError.message);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  try {
    const id = await recordMedia({
      userId: user.id,
      childId,
      storagePath: path,
      mediaType: validation.kind,
      caption,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    // If the metadata insert fails, remove the orphaned object rather than
    // leaving a file nobody can see.
    await admin.storage.from(CHILD_MEDIA_BUCKET).remove([path]).catch(() => {});
    console.error("Child media record failed:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
