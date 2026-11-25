import { cleanKeptStatement, keptStatementText, type KeptStatement } from "@/lib/keep-story";
import { cleanFirstName } from "@/lib/statement-from-notes";
import {
  CHECK_DAYS,
  checkState,
  cleanCentreName,
  educatorFirstName,
  type CheckState,
  type LeaderOffer,
} from "@/lib/story-check";
import { LEADER_SOURCES_ON } from "@/lib/build-switches";

/**
 * A whole room on one link (25 Nov 2026, A1 and A5, switch CLASS_SET_ON).
 *
 * An educator drafts a class's transition statements or summaries on
 * /statement; the drafts collect in her tab (lib/class-set.ts) and, only when
 * she presses Send, go to the server as one set her leader opens with one key.
 * Everything here is pure so the rules can be tested without a database:
 *  - 1 to 30 pieces, each with a first name only, a note no longer than the
 *    drafter allows, and a draft checked field by field (at least one outcome
 *    with something seen), exactly like a kept statement.
 *  - The leader sees first names, notes and drafts. Never an account id, an
 *    email, the key or anything else about the educator.
 *  - Content lives for the link's 14 days, then is wiped 7 days after expiry
 *    (RULINGS.txt answer 4). Decisions and the offer row stay.
 */

export const MAX_SET_PIECES = 30;
/** The drafter's own note limit (lib/ai/transition-draft.ts MAX_TRANSITION_NOTES), kept here so this file stays safe for the browser; a test holds them equal. */
export const SET_NOTE_MAX = 3000;
/** Content is wiped this many days after the link stops opening (RULINGS.txt, answer 4). */
export const SET_PURGE_DAYS = 7;

export type SetDecision = "approved" | "changes";

export type CleanPiece = {
  position: number;
  childFirstName: string;
  mode: "transition" | "summary";
  framework: KeptStatement["framework"];
  note: string;
  draft: Omit<KeptStatement, "at">;
};

/**
 * The pieces as they may be stored, or null when the set as a whole is not
 * acceptable (none left, or more than 30). A piece without a first name, with
 * a note over the limit, or with a draft that shows nothing seen is dropped.
 */
export function cleanPieces(raw: unknown, now = Date.now()): CleanPiece[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SET_PIECES) return null;
  const out: CleanPiece[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const value = item as Record<string, unknown>;
    const childFirstName = cleanFirstName(value.childFirstName);
    const note = typeof value.note === "string" ? value.note.trim() : "";
    if (!childFirstName || !note || note.length > SET_NOTE_MAX) continue;
    const draftRaw = value.draft && typeof value.draft === "object" ? (value.draft as Record<string, unknown>) : null;
    if (!draftRaw) continue;
    const kept = cleanKeptStatement({ framework: draftRaw.framework ?? value.framework, mode: draftRaw.mode ?? value.mode, outcomes: draftRaw.outcomes, checks: draftRaw.checks, at: now }, now);
    if (!kept) continue;
    if (value.mode !== undefined && value.mode !== kept.mode) continue;
    if (value.framework !== undefined && value.framework !== kept.framework) continue;
    out.push({
      position: out.length + 1,
      childFirstName,
      mode: kept.mode,
      framework: kept.framework,
      note,
      draft: { framework: kept.framework, mode: kept.mode, outcomes: kept.outcomes, checks: kept.checks },
    });
  }
  return out.length ? out : null;
}

export type SetRow = {
  id: string;
  user_id: string;
  status: "sent" | "opened" | "answered";
  centre_name: string | null;
  join_consent: boolean | null;
  /** Where each line came from (A4). Absent on rows read without the column. */
  show_sources?: boolean | null;
  created_at: string;
  opened_at: string | null;
  expires_at: string;
  revoked_at: string | null;
  purged_at?: string | null;
};

export type SetItemRow = {
  position: number;
  mode: "transition" | "summary";
  framework: string;
  child_first_name: string | null;
  note: string | null;
  draft: unknown;
  decision: SetDecision | null;
  comment: string | null;
  decided_at: string | null;
};

/** A set's rows mapped onto the story check's states: answered when every piece has a decision. */
export function setState(row: Pick<SetRow, "status" | "expires_at" | "revoked_at">, now = new Date()): CheckState {
  return checkState({ status: row.status === "answered" ? "approved" : row.status, expires_at: row.expires_at, revoked_at: row.revoked_at }, now);
}

/** Readable through the link while open, or answered and not yet past its expiry. Never after the content is wiped. */
export function canReadSet(row: Pick<SetRow, "status" | "expires_at" | "revoked_at" | "purged_at">, now = new Date()) {
  if (row.purged_at) return false;
  const state = setState(row, now);
  if (state === "open") return true;
  return state === "answered" && new Date(row.expires_at).getTime() > now.getTime();
}

/** A piece may be answered while the set is open. An answered set takes no more answers. */
export function canAnswerSet(row: Pick<SetRow, "status" | "expires_at" | "revoked_at" | "purged_at">, now = new Date()) {
  return !row.purged_at && setState(row, now) === "open";
}

export function setExpiry(now = new Date()) {
  return new Date(now.getTime() + CHECK_DAYS * 86_400_000);
}

/** When a set's content is wiped: 7 days after it stopped opening, whether it ran out or was cancelled. */
export function setPurgeDue(row: Pick<SetRow, "expires_at" | "purged_at"> & { revoked_at?: string | null }, now = new Date()) {
  if (row.purged_at) return false;
  const expires = new Date(row.expires_at).getTime();
  const revoked = row.revoked_at ? new Date(row.revoked_at).getTime() : NaN;
  const ended = Number.isFinite(revoked) && (!Number.isFinite(expires) || revoked < expires) ? revoked : expires;
  return Number.isFinite(ended) && now.getTime() >= ended + SET_PURGE_DAYS * 86_400_000;
}

/** Every piece answered? */
export function allAnswered(items: Array<Pick<SetItemRow, "decision">>) {
  return items.length > 0 && items.every((item) => item.decision === "approved" || item.decision === "changes");
}

export type SetPieceView = {
  position: number;
  childName: string;
  mode: "transition" | "summary";
  framework: KeptStatement["framework"];
  note: string;
  draft: Omit<KeptStatement, "at">;
  decision: SetDecision | null;
  comment: string;
};

function pieceView(item: SetItemRow): SetPieceView | null {
  const kept = cleanKeptStatement({ ...(item.draft && typeof item.draft === "object" ? item.draft : {}), framework: item.framework, mode: item.mode, at: Date.now() });
  if (!kept) return null;
  return {
    position: item.position,
    childName: cleanFirstName(item.child_first_name ?? ""),
    mode: kept.mode,
    framework: kept.framework,
    note: item.note ?? "",
    draft: { framework: kept.framework, mode: kept.mode, outcomes: kept.outcomes, checks: kept.checks },
    decision: item.decision === "approved" || item.decision === "changes" ? item.decision : null,
    comment: item.comment ?? "",
  };
}

/**
 * Exactly what the leader's page receives for a set. Built field by field, so
 * a column added to the tables can never leak through the link.
 */
export function setView(input: { set: SetRow; items: SetItemRow[]; educatorName: string | null | undefined; now?: Date; offer?: LeaderOffer | null; emailed?: boolean }) {
  const now = input.now ?? new Date();
  const items = [...input.items].sort((a, b) => a.position - b.position).map(pieceView).filter((p): p is SetPieceView => Boolean(p));
  const offer = input.offer;
  return {
    kind: "set" as const,
    state: setState(input.set, now),
    educator: educatorFirstName(input.educatorName),
    centreName: cleanCentreName(input.set.centre_name ?? ""),
    joinConsent: input.set.join_consent === true,
    sentByStoryLoop: input.emailed === true,
    showSources: LEADER_SOURCES_ON && input.set.show_sources === true,
    expiresAt: input.set.expires_at,
    items,
    offer: offer === null || offer === undefined ? null : { code: offer.code ?? null, ref: offer.ref ?? null, counts: null },
  };
}

export type SetView = ReturnType<typeof setView>;

/** "Transition statement" or "Summary", for a list row. */
export function pieceKindLabel(mode: "transition" | "summary") {
  return mode === "summary" ? "Summary" : "Transition statement";
}

/** One piece as plain text, the same layout as the drafter's Copy all, with the name and the leader's answer. */
export function pieceText(piece: Pick<SetPieceView, "childName" | "mode" | "draft" | "decision" | "comment">) {
  const head = `${piece.childName || "A child"}: ${pieceKindLabel(piece.mode)}`;
  const answer = piece.decision === "approved"
    ? "Leader's answer: looks good."
    : piece.decision === "changes"
      ? `Leader's answer: suggested a change.${piece.comment ? `\n${piece.comment}` : ""}`
      : "Leader's answer: not answered yet.";
  return [head, keptStatementText({ ...piece.draft, at: 0 }), answer].join("\n\n");
}
