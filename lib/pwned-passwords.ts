import { createHash } from "node:crypto";

/**
 * Has this password appeared in a known data breach?
 *
 * The check Supabase calls "leaked password protection", done here because it
 * is a paid-plan switch there. It uses Have I Been Pwned's range API with
 * k-anonymity: only the first five characters of the password's SHA-1 hash
 * leave the server, never the password or the full hash, and the match is made
 * locally against the list of suffixes that comes back. Padding makes every
 * response the same size, so even the response length says nothing.
 *
 * Returns the number of breaches it appeared in (0 when clean), or null when
 * the service could not be reached. Null never blocks anyone: a signup must not
 * depend on a third party being up.
 */
export async function pwnedCount(password: string, options: { timeoutMs?: number } = {}): Promise<number | null> {
  if (!password) return 0;
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "StoryLoop-password-check" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 2500),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return matchSuffix(await response.text(), suffix);
  } catch {
    return null;
  }
}

/** Find a hash suffix in a range response ("SUFFIX:COUNT" per line). Pure. */
export function matchSuffix(body: string, suffix: string): number {
  for (const line of body.split(/\r?\n/)) {
    const [candidate, count] = line.trim().split(":");
    if (candidate?.toUpperCase() === suffix.toUpperCase()) {
      const n = Number(count);
      // Padding entries have a count of 0; they are not real passwords.
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

export const PWNED_PASSWORD_MESSAGE =
  "That password has appeared in a known data breach, so it is one of the first passwords attackers try. Please choose a different one.";
