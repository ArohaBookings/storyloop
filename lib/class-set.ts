import type { TransitionDraft, TransitionFramework } from "@/lib/ai/transition-draft";

/**
 * A whole room's statements, collected on the statement page so they can go
 * to the leader as one set (25 Nov 2026, switch CLASS_SET_ON).
 *
 * Kept in this tab only (sessionStorage), never on the server until she
 * presses Send in components/app/SendToLeader.tsx. At most 30 pieces, each
 * dropped after 12 hours. Storage that is blocked or full simply means no set:
 * every function here returns the empty answer instead of throwing.
 * components/app/ClassSetPanel.tsx hears about a new piece through the window
 * event CLASS_SET_EVENT, so nothing is threaded through the protected drafter.
 */
export type ClassPiece = {
  childFirstName: string;
  mode: "transition" | "summary";
  framework: TransitionFramework;
  note: string;
  draft: TransitionDraft;
  /** When it was drafted, in milliseconds since 1970. */
  at: number;
};

export const CLASS_SET_KEY = "storyloop_class_set";
export const CLASS_SET_EVENT = "storyloop:class-set";
export const CLASS_SET_MAX = 30;
export const CLASS_SET_HOURS = 12;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function fresh(piece: ClassPiece, now: number) {
  return Number.isFinite(piece.at) && piece.at <= now + 60_000 && now - piece.at < CLASS_SET_HOURS * 3_600_000;
}

function valid(value: unknown): value is ClassPiece {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.childFirstName === "string" && (p.mode === "transition" || p.mode === "summary") && typeof p.framework === "string"
    && typeof p.note === "string" && typeof p.at === "number" && Boolean(p.draft) && typeof p.draft === "object";
}

/** The pieces in this tab, oldest first, expired ones dropped. */
export function listClassSet(now = Date.now(), s: Store | null = store()): ClassPiece[] {
  if (!s) return [];
  try {
    const raw = JSON.parse(s.getItem(CLASS_SET_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(valid).filter((p) => fresh(p, now)).slice(0, CLASS_SET_MAX) : [];
  } catch {
    return [];
  }
}

function announce(count: number) {
  try {
    window.dispatchEvent(new CustomEvent(CLASS_SET_EVENT, { detail: { count } }));
  } catch {
    /* no window: nothing listens */
  }
}

/**
 * Add a finished draft. The same child drafted again replaces the earlier
 * piece (she pressed Write it again). Returns false when the set is full, the
 * piece has no first name, or storage is blocked.
 */
export function addToClassSet(piece: ClassPiece, now = Date.now(), s: Store | null = store()): boolean {
  if (!s || !piece.childFirstName.trim() || !piece.draft) return false;
  const list = listClassSet(now, s);
  const key = (p: ClassPiece) => `${p.childFirstName.trim().toLocaleLowerCase("en-NZ")}|${p.mode}`;
  const rest = list.filter((p) => key(p) !== key(piece));
  if (rest.length >= CLASS_SET_MAX) return false;
  try {
    s.setItem(CLASS_SET_KEY, JSON.stringify([...rest, { ...piece, at: now }]));
  } catch {
    return false;
  }
  announce(rest.length + 1);
  return true;
}

/** Empty the set (after it is sent, or when she chooses to). */
export function clearClassSet(s: Store | null = store()) {
  try {
    s?.removeItem(CLASS_SET_KEY);
  } catch {
    /* nothing to clear */
  }
  announce(0);
}
