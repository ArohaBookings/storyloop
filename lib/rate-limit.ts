import { createHash } from "node:crypto";
import { createAdminSupabase, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
};

/**
 * Per-instance fallback counter.
 *
 * The database limiter is the real one: it is shared across every serverless
 * instance. When it cannot be reached, throwing would take down the endpoint
 * it is meant to protect (a public demo showing a backend error is worse than
 * no rate limit), and returning true would remove abuse protection from a
 * route that spends money on model calls. So we fall back to counting in
 * memory. It only sees one instance's traffic, which is weaker than the real
 * limiter, but it still caps a single caller hammering one instance and it
 * never breaks the page.
 */
const memoryHits = new Map<string, number[]>();

function consumeInMemory(bucket: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;
  const hits = (memoryHits.get(bucket) ?? []).filter((at) => at > cutoff);

  if (hits.length >= limit) {
    memoryHits.set(bucket, hits);
    return false;
  }

  hits.push(now);
  memoryHits.set(bucket, hits);

  // Keep the map from growing without bound on a long-lived instance.
  if (memoryHits.size > 5000) {
    for (const [key, times] of memoryHits) {
      if (times.every((at) => at <= cutoff)) memoryHits.delete(key);
    }
  }

  return true;
}

export async function consumeRateLimit({
  scope,
  key,
  limit,
  windowSeconds,
}: RateLimitOptions) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const bucket = `${scope}:${keyHash}`;

  if (!hasSupabaseAdminConfig()) {
    console.warn(`Rate limiter unavailable (Supabase admin not configured); using in-memory fallback for ${scope}.`);
    return consumeInMemory(bucket, limit, windowSeconds);
  }

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_scope: scope,
      p_key_hash: keyHash,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });

    if (error) {
      console.error("Rate limit check failed:", error.message);
      return consumeInMemory(bucket, limit, windowSeconds);
    }

    return data === true;
  } catch (error) {
    console.error("Rate limiter unreachable, falling back to in-memory:", error);
    return consumeInMemory(bucket, limit, windowSeconds);
  }
}
