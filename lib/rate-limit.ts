import { createHash } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function consumeRateLimit({
  scope,
  key,
  limit,
  windowSeconds,
}: RateLimitOptions) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    console.error("Rate limit check failed:", error.message);
    return false;
  }

  return data === true;
}
