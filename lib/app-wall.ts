/**
 * The free-limit walls inside the app (18 Nov 2026, fault P01 and proposal B).
 *
 * What the data said: people pay right after their third free story (6 of 17
 * who reached the limit were charged) or when they pick a paid plan at signup;
 * the old wall showed no price and sent them to Billing, and none of the three
 * people who met a wall in the fortnight before went anywhere after it.
 *
 * So the wall now keeps her work on screen, states the Educator price in her
 * currency and the trial exactly as checkout gives it (lib/offer-wording.ts),
 * and one tap goes straight to Stripe Checkout and back to the same page. A
 * quiet one-tap question asks what is stopping her. Once she has seen a wall,
 * later visits show one quiet line with the price, which she can dismiss.
 *
 * Everything here is pure or a guarded browser-storage helper. Nothing here
 * grants a plan: only Stripe's webhook does that.
 */

export type AppWall = "story" | "statement";

/** The one-tap "What is stopping you?" answers. Keys are on lib/analytics/events.ts STOP_REASONS. */
export const WALL_STOP_CHOICES = [
  { key: "price", label: "The price" },
  { key: "only_needed_few", label: "I only needed a few" },
  { key: "centre_should_pay", label: "My centre should pay" },
  { key: "not_sure_yet", label: "Not sure yet" },
  { key: "something_else", label: "Something else" },
] as const;

export type WallStopReason = (typeof WALL_STOP_CHOICES)[number]["key"];

const CHILD_TRANSITION = /^\/children\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/transition$/i;

/**
 * Where a wall's checkout may send her back to: only the app pages that hold
 * a wall. Anything else (another site, a query, a path we do not know) is
 * null, and checkout keeps its usual pages. Pure.
 */
export function checkoutReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw === "/generate" || raw === "/statement") return raw;
  return CHILD_TRANSITION.test(raw) ? raw.toLowerCase() : null;
}

// ---- What this browser remembers about walls (never sent anywhere). ----

export const WALL_MEMORY_KEY = "storyloop_wall_seen";
/** This tab saw a wall: the price reminder waits for a later visit. */
export const WALL_TAB_KEY = "storyloop_wall_this_visit";
/** Her note and story, kept in this tab only while she is at Stripe. */
export const WALL_WORK_KEY = "storyloop_wall_work";

export type WallMemory = {
  /** The last wall she saw. */
  wall: AppWall;
  /** How many walls this browser has shown. */
  count: number;
  /** When the last one showed, in ms. */
  at: number;
  /** When she dismissed the reminder line, in ms; null while it may show. */
  dismissedAt: number | null;
};

/** A stored value as it may be trusted, or null. Pure. */
export function cleanWallMemory(raw: unknown): WallMemory | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const wall = value.wall === "story" || value.wall === "statement" ? value.wall : null;
  const count = typeof value.count === "number" && Number.isFinite(value.count) ? Math.max(0, Math.min(1000, Math.floor(value.count))) : 0;
  const at = typeof value.at === "number" && Number.isFinite(value.at) ? value.at : 0;
  const dismissedAt = typeof value.dismissedAt === "number" && Number.isFinite(value.dismissedAt) ? value.dismissedAt : null;
  if (!wall || count < 1 || at <= 0) return null;
  return { wall, count, at, dismissedAt };
}

/** The memory after one more wall: the count goes up and a dismissed reminder may show again. Pure. */
export function nextWallMemory(previous: WallMemory | null, wall: AppWall, now: number): WallMemory {
  return { wall, count: (previous?.count ?? 0) + 1, at: now, dismissedAt: null };
}

/**
 * Whether the quiet price line shows: a free account, a wall seen before, not
 * in the same visit as that wall, and not dismissed since. Pure.
 */
export function shouldShowPriceReminder(input: { free: boolean; memory: WallMemory | null; wallThisVisit: boolean }): boolean {
  if (!input.free || !input.memory || input.wallThisVisit) return false;
  return input.memory.dismissedAt === null || input.memory.dismissedAt < input.memory.at;
}

function local(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function tab(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readWallMemory(): WallMemory | null {
  try {
    const raw = local()?.getItem(WALL_MEMORY_KEY);
    return raw ? cleanWallMemory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Remembers one more wall and returns how many this browser had shown before it. */
export function rememberWall(wall: AppWall): number {
  const previous = readWallMemory();
  try {
    local()?.setItem(WALL_MEMORY_KEY, JSON.stringify(nextWallMemory(previous, wall, Date.now())));
    tab()?.setItem(WALL_TAB_KEY, "1");
  } catch {
    /* storage blocked: the reminder simply never shows */
  }
  return previous?.count ?? 0;
}

export function wallSeenThisVisit(): boolean {
  try {
    return tab()?.getItem(WALL_TAB_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPriceReminder() {
  const memory = readWallMemory();
  if (!memory) return;
  try {
    local()?.setItem(WALL_MEMORY_KEY, JSON.stringify({ ...memory, dismissedAt: Date.now() }));
  } catch {
    /* nothing to do */
  }
}

// ---- Her work, kept in this tab while she is at Stripe. ----

export const WALL_WORK_MAX = 8000;
const WORK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type WallWork = {
  page: string;
  /** Her note (the story page) or her notes (the statement page). */
  note: string;
  /** The story on screen when she met the wall, by id; it is already saved in her stories. */
  storyId: string | null;
  /** The statement page: the draft on screen, as it was. */
  draft: unknown;
  framework: string | null;
  mode: string | null;
  at: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kept work as it may be trusted, for the page it was kept on, or null. Pure. */
export function cleanWallWork(raw: unknown, page: string, now: number): WallWork | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.page !== page) return null;
  const at = typeof value.at === "number" && Number.isFinite(value.at) ? value.at : 0;
  if (at <= 0 || at > now + 60_000 || now - at > WORK_MAX_AGE_MS) return null;
  const note = typeof value.note === "string" ? value.note.slice(0, WALL_WORK_MAX) : "";
  const storyId = typeof value.storyId === "string" && UUID.test(value.storyId) ? value.storyId : null;
  const framework = typeof value.framework === "string" ? value.framework.slice(0, 20) : null;
  const mode = typeof value.mode === "string" ? value.mode.slice(0, 20) : null;
  const draft = value.draft && typeof value.draft === "object" ? value.draft : null;
  if (!note && !storyId && !draft) return null;
  return { page, note, storyId, draft, framework, mode, at };
}

/** Keeps her work in this tab only, for the trip to Stripe and back. */
export function keepWallWork(work: Omit<WallWork, "at">) {
  try {
    tab()?.setItem(WALL_WORK_KEY, JSON.stringify({ ...work, note: work.note.slice(0, WALL_WORK_MAX), at: Date.now() }));
  } catch {
    /* storage blocked: her stories are saved anyway */
  }
}

/** Her kept work for this page, once: it is removed as it is read. */
export function takeWallWork(page: string): WallWork | null {
  try {
    const store = tab();
    const raw = store?.getItem(WALL_WORK_KEY);
    if (!raw) return null;
    const work = cleanWallWork(JSON.parse(raw), page, Date.now());
    if (work) store?.removeItem(WALL_WORK_KEY);
    return work;
  } catch {
    return null;
  }
}
