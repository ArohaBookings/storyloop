import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  const sb = createAdminSupabase();
  await sb.from("admin_audit_log").insert({ action, target_type: targetType, target_id: targetId, details });
}
