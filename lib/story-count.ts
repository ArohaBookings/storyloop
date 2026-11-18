import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether an account has written a story, asked of the stories table (fault
 * P11, 18 Nov 2026).
 *
 * profiles.total_stories is a running counter. Accounts made from 18 May to 16
 * June 2026 wrote stories before the story routes kept it, so four of them
 * still read 0 with stories saved, and on 17 June 2026 each was emailed that they had
 * not written a first story. A counter above zero is trusted (stories are never
 * written without it now); a zero is checked against the table before anything
 * tells an educator she has no stories.
 */

/** The most rows the database hands back in one request (Supabase's default cap). */
const PAGE_ROWS = 1000;

/** True or false from the counter when it can answer, else null: ask the table (pure). */
export function storiesFromCounter(totalStories: number | null | undefined): boolean | null {
  return typeof totalStories === "number" && totalStories > 0 ? true : null;
}

/** Whether this account has at least one story row. Null when the table could not be read. */
export async function accountHasStories(db: SupabaseClient, userId: string, totalStories?: number | null): Promise<boolean | null> {
  const fromCounter = storiesFromCounter(totalStories);
  if (fromCounter !== null) return fromCounter;
  try {
    const { count, error } = await db.from("stories").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (error) return null;
    return (count ?? 0) > 0;
  } catch {
    return null;
  }
}

/**
 * Of these accounts, the ones with at least one story row. Null when the table
 * could not be read, so a caller about to say "you have not written a story"
 * can hold back instead of guessing.
 */
export async function accountsWithStories(db: SupabaseClient, userIds: string[]): Promise<Set<string> | null> {
  const ids = [...new Set(userIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (ids.length === 0) return new Set();
  const found = new Set<string>();
  try {
    // In batches, so a long list never makes an oversized request.
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { data, error } = await db.from("stories").select("user_id").in("user_id", batch).limit(PAGE_ROWS);
      if (error) return null;
      // A full page may have cut someone off: unsure, so say so rather than guess.
      if ((data ?? []).length >= PAGE_ROWS) return null;
      for (const row of (data ?? []) as Array<{ user_id: string | null }>) {
        if (row.user_id) found.add(row.user_id);
      }
    }
    return found;
  } catch {
    return null;
  }
}

/**
 * Whether this account has a story other than this one, asked of the stories
 * table: so "your first story" is never said to someone whose counter reads 0
 * with stories saved. Null when the table could not be read.
 */
export async function hasOtherStories(db: SupabaseClient, userId: string, storyId?: string | null): Promise<boolean | null> {
  try {
    let query = db.from("stories").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (storyId) query = query.neq("id", storyId);
    const { count, error } = await query;
    if (error) return null;
    return (count ?? 0) > 0;
  } catch {
    return null;
  }
}

/** The rows that really have no story: everything when none of them has one, nothing when the table could not be read (pure). */
export function withoutStories<T extends { id: string }>(rows: T[], withStories: Set<string> | null): T[] {
  if (!withStories) return [];
  return rows.filter((row) => !withStories.has(row.id));
}
