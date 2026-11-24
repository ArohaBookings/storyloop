import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * StoryLoop emails the leader (25 Nov 2026, A2, switch LEADER_EMAIL_ON).
 *
 * One email in the educator's first name, one reminder about 48 hours later
 * if the leader has not opened it, then nothing, ever, for that link. Every
 * rule that decides whether an email may go is here and pure, so it can be
 * tested without a database or a mail server. lib/email/leader-check.ts sends.
 */

export const LEADER_EMAILS_PER_DAY = 3;
export const REMINDER_AFTER_HOURS = 48;

export type HeldReason = "cap" | "suppressed" | "paused" | "no_name" | "invalid" | "own" | "duplicate" | "off";

/** A plain address check: one @, a dot in the domain, no spaces, not too long. */
export function cleanLeaderAddress(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const value = raw.trim().toLowerCase();
  return value.length <= 254 && /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/.test(value) ? value : "";
}

export function recipientHash(email: string) {
  return createHash("sha256").update(`leader-recipient:${email.trim().toLowerCase()}`).digest("hex");
}

/**
 * The educator's first name, only when it is a real name: never the start of
 * her email address. Without one the email cannot say who it is from, so she
 * is asked for it first.
 */
export function senderFirstName(fullName: string | null | undefined, ownEmail: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return "";
  const clean = first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30);
  if (!clean) return "";
  const local = (ownEmail ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (local && clean.toLowerCase() === local) return "";
  return clean;
}

export type SendFacts = {
  switchOn: boolean;
  address: string;
  ownEmail: string | null;
  firstName: string;
  suppressed: boolean;
  sentLast24h: number;
  alreadyForThisLink: boolean;
  paused: boolean;
};

/** May the first email go? The first reason that holds it, in the order a person would want to hear it. */
export function canSendLeaderEmail(f: SendFacts): { ok: true } | { ok: false; reason: HeldReason } {
  if (!f.switchOn) return { ok: false, reason: "off" };
  if (!f.address) return { ok: false, reason: "invalid" };
  if (f.ownEmail && f.address === f.ownEmail.trim().toLowerCase()) return { ok: false, reason: "own" };
  if (f.alreadyForThisLink) return { ok: false, reason: "duplicate" };
  if (!f.firstName) return { ok: false, reason: "no_name" };
  // Honoured for ever, whatever the reason the address is on the list.
  if (f.suppressed) return { ok: false, reason: "suppressed" };
  if (f.paused) return { ok: false, reason: "paused" };
  if (f.sentLast24h >= LEADER_EMAILS_PER_DAY) return { ok: false, reason: "cap" };
  return { ok: true };
}

/** What she reads when it is held. The link is always made, so there is never a dead end. */
export function heldMessage(reason: HeldReason, leaderLabel = "your leader") {
  switch (reason) {
    case "cap": return `StoryLoop sends at most ${LEADER_EMAILS_PER_DAY} of these a day for you. Copy the link and send it yourself.`;
    case "suppressed": return `${leaderLabel === "your leader" ? "That address" : leaderLabel} asked StoryLoop not to email them. Copy the link and send it yourself.`;
    case "paused": return "StoryLoop's email is paused just now. Copy the link and send it yourself.";
    case "no_name": return "Add your first name so your leader knows who it is from.";
    case "invalid": return "That email address does not look right. Check it, or copy the link instead.";
    case "own": return "That is your own address. Put your leader's address in, or copy the link.";
    case "duplicate": return "This link has already been emailed. Make a new link to send it again.";
    case "off": return "Copy the link and send it yourself.";
  }
}

export type ReminderRow = {
  status: string;
  first_sent_at: string | null;
  reminder_sent_at: string | null;
};

export type ReminderFacts = {
  /** opened_at on the story check or set: the leader tapped the cover. */
  openedAt: string | null;
  answered: boolean;
  revokedAt: string | null;
  expiresAt: string;
  suppressed: boolean;
  paused: boolean;
};

/** Is the one reminder due? Pure. */
export function reminderDue(row: ReminderRow, facts: ReminderFacts, now = new Date()): boolean {
  if (row.status !== "sent" || row.reminder_sent_at || !row.first_sent_at) return false;
  const first = Date.parse(row.first_sent_at);
  if (!Number.isFinite(first) || now.getTime() < first + REMINDER_AFTER_HOURS * 3_600_000) return false;
  if (facts.openedAt || facts.answered || facts.revokedAt || facts.suppressed || facts.paused) return false;
  const expires = Date.parse(facts.expiresAt);
  return Number.isFinite(expires) && now.getTime() < expires;
}

function stopSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? process.env.CRON_SECRET ?? "storyloop-dev-unsubscribe";
}

function stopSignature(email: string) {
  return createHmac("sha256", stopSecret()).update(`leader-stop:${email.trim().toLowerCase()}`).digest("base64url");
}

/** The "Stop these emails" token: the address and its signature, nothing else. */
export function stopToken(email: string) {
  const address = email.trim().toLowerCase();
  return Buffer.from(JSON.stringify({ e: address, s: stopSignature(address) }), "utf8").toString("base64url");
}

/** The address a stop token is for, or null when it was changed in any way. Case does not matter. */
export function verifyStopToken(token: unknown): string | null {
  if (typeof token !== "string" || token.length > 1000) return null;
  try {
    const value = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as { e?: unknown; s?: unknown };
    if (typeof value.e !== "string" || typeof value.s !== "string") return null;
    const address = value.e.trim().toLowerCase();
    const expected = Buffer.from(stopSignature(address));
    const actual = Buffer.from(value.s);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return address;
  } catch {
    return null;
  }
}
