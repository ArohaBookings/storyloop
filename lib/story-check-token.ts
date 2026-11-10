import { createHash, randomBytes } from "node:crypto";

/** Server only. The link key for a leader check (lib/story-check.ts) and the hash stored in its place. */
export function hashCheckToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** A new link key: 24 random bytes as 32 URL-safe characters. Shown to the educator once, never stored. */
export function newCheckToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashCheckToken(token) };
}
