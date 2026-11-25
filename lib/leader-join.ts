import { recipientHash } from "@/lib/leader-email";

/**
 * Joining a centre by the tick, only for the right leader (25 Nov 2026, MERGE2 2b).
 *
 * The educator ticks "If my leader starts our centre on StoryLoop, add me to
 * the team" when she sends a check. Whoever holds the link can open it, so
 * the tick alone must not put her in a stranger's team. She is added with no
 * invitation only when the account that starts the centre has a VERIFIED
 * email address, and it is the address StoryLoop emailed the check to. A link
 * she copied herself (no email went), a different address, or an address
 * nobody has proved, gets the one-tap invitation instead, which she must
 * accept. Pure: the caller reads the account and the send rows.
 */

export type AccountForJoin = {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string | null; identity_data?: Record<string, unknown> | null }> | null;
};

/**
 * The account's address when StoryLoop knows its owner reads that inbox, or
 * null. A password signup is created confirmed without any email being opened
 * (app/api/auth/signup), so it does not count. Google checks the address it
 * hands over; an "Email me a link" signup (app_metadata, written only by the
 * server) was finished from the inbox.
 */
export function verifiedEmailOf(account: AccountForJoin | null | undefined): string | null {
  const email = (account?.email ?? "").trim().toLowerCase();
  if (!email) return null;
  const google = (account?.identities ?? []).some(
    (identity) => identity?.provider === "google" && String(identity.identity_data?.email ?? "").trim().toLowerCase() === email,
  );
  if (google) return email;
  if (account?.app_metadata?.signup_method === "link") return email;
  return null;
}

/** May the tick add her with no invitation? Only for the verified address her leader email went to. */
export function mayJoinByTick(input: { consent: boolean; sentHashes: string[]; verifiedEmail: string | null }): boolean {
  if (!input.consent || !input.verifiedEmail || input.sentHashes.length === 0) return false;
  const hash = recipientHash(input.verifiedEmail);
  return input.sentHashes.includes(hash);
}
