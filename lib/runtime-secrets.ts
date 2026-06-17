import { createAdminSupabase } from "@/lib/supabase/admin";

const cache = new Map<string, string | null>();

export async function getRuntimeSecret(envName: string, secretKey: string) {
  const envValue = process.env[envName];
  if (envValue) return envValue;

  if (cache.has(secretKey)) return cache.get(secretKey) ?? undefined;

  const { data, error } = await createAdminSupabase().rpc("get_app_secret", { p_key: secretKey });
  if (error) {
    cache.set(secretKey, null);
    return undefined;
  }

  const value = typeof data === "string" && data ? data : null;
  cache.set(secretKey, value);
  return value ?? undefined;
}
