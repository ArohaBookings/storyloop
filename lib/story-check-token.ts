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

/**
 * The centre offer's reference for a check (13 Nov 2026). Derived from the link
 * key with a one-way hash, so it is NOT the key: it cannot be turned back into
 * one, it is not 32 characters (lib/story-check.ts looksLikeCheckToken refuses
 * it), and it opens no story and no note. Its only use is lib/leader-offer-server.ts:
 * a signed-in account that starts a centre may claim it once, to have the
 * centre's name filled in and the educator one tap from an invitation.
 */
export function offerRefFor(token: string) {
  return createHash("sha256").update(`storyloop-leader-offer:${token}`).digest("base64url");
}

/** What is stored in place of an offer reference, like the link key's hash. */
export function hashOfferRef(ref: string) {
  return createHash("sha256").update(`offer:${ref}`).digest("hex");
}
