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

/**
 * Refuse only passwords that are genuinely common in breaches (20 Oct 2026).
 *
 * From 22 Sep to 20 Oct any password seen even once was refused. Ordinary,
 * memorable passwords very often appear somewhere in the 900M-entry list, and
 * signup completions fell over those weeks (17 signup views, 2 accounts after
 * 6 Oct); educators on phones met "choose another" and left. Leo: "email and
 * password, that's it". The passwords attackers actually spray ("password123",
 * "kindy2024") appear hundreds to millions of times, so this threshold still
 * stops those while letting a rare, personal password through.
 */
export const COMMON_BREACH_COUNT = 100;

export function shouldRefusePassword(breachCount: number | null): boolean {
  return (breachCount ?? 0) >= COMMON_BREACH_COUNT;
}

export const PWNED_PASSWORD_MESSAGE =
  "That password is one of the most common leaked passwords (it does not mean your account was hacked), so attackers try it first. Please choose another, or let us make one for you.";
