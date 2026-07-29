import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function hasSupabaseAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function createAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment is not configured.");
  }

  return createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
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
