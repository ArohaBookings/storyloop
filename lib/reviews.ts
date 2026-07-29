import { createAdminSupabase, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export type Review = {
  id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  rating: number;
  body: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export type PublicReview = {
  id: string;
  displayName: string;
  role: string | null;
  rating: number;
  body: string;
  publishedAt: string | null;
};

/**
 * Shorten a name for public display: first name plus last initial. "Marcelle
 * Bidois" becomes "Marcelle B." A single name stays as is. This protects the
 * reviewer while keeping the review credible.
 */
export function shortenName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "An educator";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

/**
 * Published reviews for the landing page. Empty until one is published.
 *
 * This runs during static generation of the landing page, so it must never
 * throw: if the database is unreachable at build time, or the service key is
 * not present in the build environment, the page still builds and simply shows
 * no reviews. A marketing page failing to deploy because of the database is not
 * acceptable.
 */
export async function listPublishedReviews(limit = 12): Promise<PublicReview[]> {
  if (!hasSupabaseAdminConfig()) return [];

  try {
    const { data } = await createAdminSupabase()
      .from("reviews")
      .select("id, reviewer_name, reviewer_role, rating, body, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) => ({
      id: row.id,
      displayName: shortenName(row.reviewer_name),
      role: row.reviewer_role,
      rating: row.rating,
      body: row.body,
      publishedAt: row.published_at,
    }));
  } catch (error) {
    console.error("listPublishedReviews failed, returning empty:", error);
    return [];
  }
}

export async function reviewSummary() {
  if (!hasSupabaseAdminConfig()) return { count: 0, average: 0 };

  try {
    const admin = createAdminSupabase();
    const { data } = await admin.from("reviews").select("rating").eq("status", "published");
    const rows = data ?? [];
    if (rows.length === 0) return { count: 0, average: 0 };
    const average = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
    return { count: rows.length, average: Math.round(average * 10) / 10 };
  } catch (error) {
    console.error("reviewSummary failed, returning empty:", error);
    return { count: 0, average: 0 };
  }
}
