import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Family portal media, first slice.
 *
 * Everything here is gated by isFamilyPortalEnabled(). While the flag is off,
 * the API refuses every request, so this code cannot affect a live user even
 * though the tables and bucket exist. Turning the flag on is a deliberate act,
 * not something that happens by accident.
 */

export const CHILD_MEDIA_BUCKET = "child-media";

/**
 * The family portal ships dark until it is finished. Flip STORYLOOP_FAMILY_PORTAL
 * to "on" only when the whole flow (upload, caption, share, family view) is
 * built and tested. Until then every entry point returns not-enabled.
 */
export function isFamilyPortalEnabled() {
  return process.env.STORYLOOP_FAMILY_PORTAL === "on";
}

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/quicktime"]);
const MAX_BYTES = 25 * 1024 * 1024;

export type MediaValidation = { ok: true; kind: "image" | "video" } | { ok: false; reason: string };

export function validateUpload(contentType: string, sizeBytes: number): MediaValidation {
  if (sizeBytes > MAX_BYTES) return { ok: false, reason: "File is larger than 25MB." };
  if (ALLOWED_IMAGE.has(contentType)) return { ok: true, kind: "image" };
  if (ALLOWED_VIDEO.has(contentType)) return { ok: true, kind: "video" };
  return { ok: false, reason: "Only JPEG, PNG, WebP, HEIC images or MP4/MOV video are allowed." };
}

/** Build the owner-scoped storage path. The first segment is the user id, which
 *  the storage RLS policy checks, so a user can never write outside their space. */
export function mediaPath(userId: string, childId: string | null, filename: string) {
  const safeName =
    filename
      .replace(/[^a-zA-Z0-9._-]/g, "_") // no slashes, spaces or anything odd
      .replace(/\.{2,}/g, ".") // collapse .. so no traversal-looking sequences
      .replace(/^\.+/, "") // no leading dots
      .slice(-80) || "upload";
  const child = childId ?? "unfiled";
  // First segment is always the authenticated user id, which the storage RLS
  // policy enforces, so a file can never be written outside the owner's space.
  return `${userId}/${child}/${Date.now()}_${safeName}`;
}

/** Confirm a child belongs to this user before media is attached to it. */
export async function userOwnsChild(userId: string, childId: string) {
  const { data } = await createAdminSupabase()
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function recordMedia(params: {
  userId: string;
  childId: string | null;
  storagePath: string;
  mediaType: "image" | "video";
  caption?: string | null;
}) {
  const { data, error } = await createAdminSupabase()
    .from("child_media")
    .insert({
      user_id: params.userId,
      child_id: params.childId,
      storage_path: params.storagePath,
      media_type: params.mediaType,
      caption: params.caption ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listMediaForChild(userId: string, childId: string) {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("child_media")
    .select("id, storage_path, media_type, caption, shared_with_family, created_at")
    .eq("user_id", userId)
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(200);

  // Signed URLs so a private object can be shown without making the bucket
  // public. Short lived on purpose.
  const items = [];
  for (const row of data ?? []) {
    const { data: signed } = await admin.storage
      .from(CHILD_MEDIA_BUCKET)
      .createSignedUrl(row.storage_path, 60 * 60);
    items.push({ ...row, url: signed?.signedUrl ?? null });
  }
  return items;
}
