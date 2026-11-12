import { createAdminSupabase } from "@/lib/supabase/admin";
import { CENTRE_CARD_DISMISSED_EVENT, ROLE_EVENT, cleanWorkRole, type WorkRole } from "@/lib/work-role";

/**
 * The account's latest answer to the role question (lib/work-role.ts), and
 * whether the centre card was dismissed. Throws on a failed read, so each
 * caller decides what "could not tell" means for its own card.
 */
export async function workRoleFacts(userId: string): Promise<{ role: WorkRole | null; dismissed: boolean }> {
  const { data: answers, error } = await createAdminSupabase()
    .from("page_events")
    .select("event_type, metadata, created_at")
    .eq("user_id", userId)
    .in("event_type", [ROLE_EVENT, CENTRE_CARD_DISMISSED_EVENT])
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const rows = answers ?? [];
  return {
    role: cleanWorkRole((rows.find((row) => row.event_type === ROLE_EVENT)?.metadata as { role?: unknown } | null)?.role),
    dismissed: rows.some((row) => row.event_type === CENTRE_CARD_DISMISSED_EVENT),
  };
}
