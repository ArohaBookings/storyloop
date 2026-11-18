/**
 * The release's event vocabulary (18 Nov 2026): every event the December
 * release fires, where it fires, and exactly what its metadata may carry.
 *
 * One list, read by three things:
 * - the browser helper (lib/analytics/track-event.ts), which drops any key
 *   that is not listed here and any value that is not an id, a number, a
 *   yes/no or one of the listed values, before anything is sent;
 * - the tracking endpoint (app/api/track/route.ts), which accepts these names
 *   and runs the same clean-up again on the new ones, so a stale tab or a
 *   hand-made request cannot store anything else;
 * - storyloop-ops/build-2026-11-18/events.json, generated from this file.
 *
 * Privacy, by construction: no value here can hold text a person typed, a
 * child's name or an email address. Strings are only ever a UUID, a listed
 * value, a short lowercase code (a film or a button name chosen in code) or
 * a public page path. A new button that needs measuring uses ui_action with
 * its own short name, so nobody has to edit this list to add one.
 *
 * Consent: "any" events are funnel steps, recorded like page views whatever
 * the cookie choice (lib/analytics/consent.ts). "all" events describe how
 * someone used a form or a control and are only sent after "Allow", like
 * EngagementTracker's clicks.
 */

import { PLAN_ORDER } from "@/lib/plans";
import { EXIT_REASONS } from "@/lib/exit-feedback";
import { WALL_LANGUAGE_CODES } from "@/lib/wall-languages";

export type ValueSpec =
  | { readonly kind: "id" }
  | { readonly kind: "code" }
  | { readonly kind: "path" }
  | { readonly kind: "number"; readonly min: number; readonly max: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "enum"; readonly values: readonly string[] };

export type EventDefinition = {
  /** Where it fires: the page or component, for people reading the data. */
  readonly where: string;
  /** "any": a funnel step, recorded whatever the cookie choice. "all": only after "Allow". */
  readonly consent: "any" | "all";
  /** true: added by this release, so the endpoint cleans its metadata too. false: an existing event, keys extended. */
  readonly isNew: boolean;
  readonly keys: { readonly [key: string]: ValueSpec };
};

/** A UUID: a story, a child, an account. */
const ID = { kind: "id" } as const;
/** A short lowercase code chosen in code (a film, a button): never typed by a person. */
const CODE = { kind: "code" } as const;
/** A public page path, such as /tlds-examples. No query, no hash, no long ids. */
const PATH = { kind: "path" } as const;
const BOOL = { kind: "boolean" } as const;
function num(max = 1_000_000, min = 0) {
  return { kind: "number", min, max } as const;
}
function oneOf<const T extends readonly string[]>(...values: T) {
  return { kind: "enum", values } as const;
}

/** Which wall. "story" and "statement" in the app; "demo" and "guide_drafter" on public pages. */
export const WALLS = ["story", "statement", "demo", "guide_drafter", "quill", "feature", "family_translation"] as const;
export const CURRENCIES = ["NZD", "AUD"] as const;
export const DEVICES = ["mobile", "tablet", "desktop"] as const;
/**
 * The one-tap "what is stopping you?" answers: the public exit question's own
 * reasons (lib/exit-feedback.ts), plus two that only make sense at a wall.
 */
export const STOP_REASONS = [...EXIT_REASONS.map((reason) => reason.key), "centre_should_pay", "need_more_free", "only_needed_few", "not_sure_yet"] as const;
/** Neutral names for the copy-pack layouts (the in-app labels are decided separately). */
export const EXPORT_PACKS = ["pack_1", "pack_2", "pack_3", "pack_4"] as const;
export const EXPORT_FORMATS = ["copy", "pack_copy", "txt", "csv", "docx", "pdf", "print", "download_all"] as const;
export const SIGNUP_FIELDS = ["name", "email", "password", "access_code", "centre_name", "role", "plan", "currency"] as const;
/** Server refusals (app/api/auth/signup, SignupForm) and the browser's own checks. */
export const SIGNUP_ERROR_CODES = [
  "rate_limited",
  "bot_check",
  "missing_name",
  "missing_email",
  "invalid_email",
  "email_typo",
  "missing_password",
  "short_password",
  "disposable_email",
  "human_check_failed",
  "human_check_reused",
  "pwned_password",
  "bad_access_code",
  "email_exists",
  "session_failed",
  "server_error",
  "network",
  "unknown",
] as const;
export const SIGNUP_LEFT_STATES = ["untouched", "focused", "typing", "error_shown", "submitting", "google_started", "link_requested"] as const;
export const OAUTH_CANCEL_STAGES = ["chooser_closed", "access_denied", "in_app_blocked", "no_session", "unknown"] as const;
export const BOT_CHECK_CODES = ["no_pass", "human_check_failed", "human_check_reused", "bot_check", "timeout"] as const;
export const DRAFT_KINDS = ["story", "statement", "summary"] as const;
export const NOTE_METHODS = ["typed", "voice", "photo", "example", "room"] as const;
export const CARD_STATUSES = ["past_due", "unpaid", "incomplete"] as const;
const PLANS = PLAN_ORDER;

export const EVENTS = {
  // ---- In the app (signed in). Ids and counts only, never story text. ----
  app_story_copied: {
    where: "app/(app)/generate/page.tsx and story pages: the Copy button under a finished story",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, how: oneOf("button", "pack", "family"), first: BOOL },
  },
  app_story_edit_started: {
    where: "story panel: the first change to a finished story in the editor (once per story per page load)",
    consent: "any",
    isNew: true,
    keys: { story_id: ID },
  },
  app_story_regenerated: {
    where: "story panel: Write it again / regenerate",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, n: num(50) },
  },
  app_export: {
    where: "story panel export menu, ExportPackPanel, History's Download everything",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, format: oneOf(...EXPORT_FORMATS), pack: oneOf(...EXPORT_PACKS), stories: num(10_000) },
  },
  family_link_made: {
    where: "components/app family link (existing event, keys extended)",
    consent: "any",
    isNew: false,
    keys: { language: oneOf("en", ...WALL_LANGUAGE_CODES), story_id: ID, child_id: ID },
  },
  leader_check_sent: {
    where: "the row beside Copy: Send this story to your leader (existing event, keys extended)",
    consent: "any",
    isNew: false,
    keys: { centre_name: BOOL, counts: BOOL, story_id: ID },
  },
  app_first_session_open: {
    where: "app/(app) layout: the first signed-in page an account opens in its first session",
    consent: "any",
    isNew: true,
    keys: { page: PATH, from_signup: BOOL },
  },
  app_first_note_started: {
    where: "the note box on /generate, first keystroke ever for the account: a flag only, never what was typed",
    consent: "any",
    isNew: true,
    keys: { method: oneOf(...NOTE_METHODS) },
  },
  app_first_story_done: {
    where: "/generate: the account's first finished story",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, seconds_since_signup: num(10_000_000) },
  },
  keep_story_arrived: {
    where: "components/app/KeepStoryImporter.tsx: a demo story kept through signup is on the account",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, kind: oneOf(...DRAFT_KINDS) },
  },

  // ---- Walls: the free limit, in the app and on public pages. ----
  wall_shown: {
    where: "every limit wall (LimitWall): the story and statement walls in the app, the demo and guide drafter walls",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS), plan: oneOf(...PLANS), currency: oneOf(...CURRENCIES), price: num(1000), trial_days: num(400), shown_before: num(1000) },
  },
  wall_checkout_tap: {
    where: "the wall's one-tap button to Stripe Checkout",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS), plan: oneOf(...PLANS), currency: oneOf(...CURRENCIES) },
  },
  wall_dismissed: {
    where: "the wall's Not now / close",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS) },
  },
  wall_reason: {
    where: "the wall's one-tap 'what is stopping you?'",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS), reason: oneOf(...STOP_REASONS) },
  },
  price_reminder_shown: {
    where: "the price shown again on a later visit after a wall",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS), plan: oneOf(...PLANS), currency: oneOf(...CURRENCIES), price: num(1000) },
  },
  price_reminder_tap: {
    where: "the price reminder's button",
    consent: "any",
    isNew: true,
    keys: { wall: oneOf(...WALLS), plan: oneOf(...PLANS), currency: oneOf(...CURRENCIES) },
  },

  // ---- Second story, copy pack, review ask, card banner (app). ----
  second_story_offered: {
    where: "/generate: the next-moment card under a first story",
    consent: "any",
    isNew: true,
    keys: { story_id: ID },
  },
  second_story_started: {
    where: "/generate: the next-moment card tapped (child: the same child, or another child or the first of her own after the example)",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, child: oneOf("same", "another") },
  },
  copy_pack_opened: {
    where: "the copy pack beside Copy",
    consent: "any",
    isNew: true,
    keys: { story_id: ID },
  },
  copy_pack_copied: {
    where: "a copy pack layout copied",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, pack: oneOf(...EXPORT_PACKS) },
  },
  review_ask_shown: {
    where: "the review ask at the moment of copy",
    consent: "any",
    isNew: true,
    keys: { story_id: ID },
  },
  review_ask_sent: {
    where: "the review ask: a rating sent",
    consent: "any",
    isNew: true,
    keys: { story_id: ID, rating: num(5, 1) },
  },
  review_ask_dismissed: {
    where: "the review ask: No thanks (never asked again)",
    consent: "any",
    isNew: true,
    keys: { story_id: ID },
  },
  card_banner_shown: {
    where: "the in-app banner when a payment failed (opens the card update on Billing)",
    consent: "any",
    isNew: true,
    keys: { status: oneOf(...CARD_STATUSES) },
  },
  card_banner_tap: {
    where: "the card-failed banner's button",
    consent: "any",
    isNew: true,
    keys: { status: oneOf(...CARD_STATUSES) },
  },

  // ---- The signup page. ----
  signup_view: {
    where: "app/(auth)/signup/SignupForm.tsx on load (existing event, keys added)",
    consent: "any",
    isNew: false,
    keys: { entry: PATH, device: oneOf(...DEVICES), in_app: BOOL, plan: oneOf(...PLANS), has_draft: BOOL },
  },
  signup_field_focus: {
    where: "SignupForm: the first focus on each field (which field only)",
    consent: "all",
    isNew: true,
    keys: { field: oneOf(...SIGNUP_FIELDS), seconds: num(36_000) },
  },
  signup_error: {
    where: "SignupForm: any error shown, from the browser's own check or the server (existing event, keys extended)",
    consent: "any",
    isNew: false,
    keys: { code: oneOf(...SIGNUP_ERROR_CODES), side: oneOf("client", "server"), field: oneOf(...SIGNUP_FIELDS), status: num(599), plan: oneOf(...PLANS) },
  },
  oauth_started: {
    where: "lib/auth/oauth.ts: Continue with Google pressed (existing event)",
    consent: "any",
    isNew: false,
    keys: { provider: oneOf("google"), intent: oneOf("signup", "login") },
  },
  oauth_returned: {
    where: "app/auth/finish: back from Google with a session",
    consent: "any",
    isNew: true,
    keys: { provider: oneOf("google"), intent: oneOf("signup", "login"), new_account: BOOL },
  },
  oauth_cancelled: {
    where: "back from Google without a session (chooser closed, access denied, blocked in an in-app browser)",
    consent: "any",
    isNew: true,
    keys: { provider: oneOf("google"), stage: oneOf(...OAUTH_CANCEL_STAGES), in_app: BOOL },
  },
  signup_email_link_requested: {
    where: "signup or the keep card: an emailed sign-in link asked for",
    consent: "any",
    isNew: true,
    keys: { plan: oneOf(...PLANS), has_draft: BOOL },
  },
  signup_submitted: {
    where: "SignupForm: Create account pressed (existing event)",
    consent: "any",
    isNew: false,
    keys: { plan: oneOf(...PLANS), seconds: num(36_000) },
  },
  signup_completed: {
    where: "SignupForm and /auth/finish: the account exists (existing event)",
    consent: "any",
    isNew: false,
    keys: { plan: oneOf(...PLANS), method: oneOf("email", "google", "link") },
  },
  signup_left: {
    where: "SignupForm: the page is left without an account (last state and seconds on the page)",
    consent: "all",
    isNew: true,
    keys: { last: oneOf(...SIGNUP_LEFT_STATES), seconds: num(36_000) },
  },
  signup_bot_check_failed: {
    where: "SignupForm: the invisible human check could not be earned before submit",
    consent: "any",
    isNew: true,
    keys: { code: oneOf(...BOT_CHECK_CODES) },
  },
  signup_draft_carried: {
    where: "SignupForm: a draft (story or statement) is waiting to be kept on the new account",
    consent: "any",
    isNew: true,
    keys: { kind: oneOf(...DRAFT_KINDS) },
  },

  // ---- Guides (public). ----
  guide_drafter_seen: {
    where: "a guide's drafter or note box scrolled into view",
    consent: "any",
    isNew: true,
    keys: { page: PATH, kind: oneOf(...DRAFT_KINDS) },
  },
  guide_drafter_started: {
    where: "a guide's drafter: Write it pressed",
    consent: "any",
    isNew: true,
    keys: { page: PATH, kind: oneOf(...DRAFT_KINDS) },
  },
  guide_drafter_finished: {
    where: "a guide's drafter: the draft is on screen",
    consent: "any",
    isNew: true,
    keys: { page: PATH, kind: oneOf(...DRAFT_KINDS), seconds: num(600) },
  },
  guide_limit_tap: {
    where: "the button on a guide or demo limit line",
    consent: "any",
    isNew: true,
    keys: { page: PATH, wall: oneOf(...WALLS) },
  },
  exit_question_shown: {
    where: "the exit question on pricing, features, for-centres and the walls",
    consent: "any",
    isNew: true,
    keys: { page: PATH, wall: oneOf(...WALLS) },
  },
  exit_question_answered: {
    where: "the exit question: one reason tapped (the reason only, never a typed note)",
    consent: "any",
    isNew: true,
    keys: { page: PATH, wall: oneOf(...WALLS), reason: oneOf(...STOP_REASONS) },
  },

  // ---- Films. film_play and film_complete exist; film is the film's code. ----
  film_play: {
    where: "the homepage films (existing event, keys extended)",
    consent: "any",
    isNew: false,
    keys: { variant: oneOf("nz", "au"), film: CODE },
  },
  film_switch: {
    where: "the homepage films: moving from one film to another",
    consent: "any",
    isNew: true,
    keys: { variant: oneOf("nz", "au"), from: CODE, to: CODE },
  },
  film_complete: {
    where: "the homepage films (existing event, keys extended)",
    consent: "any",
    isNew: false,
    keys: { variant: oneOf("nz", "au"), film: CODE },
  },

  // ---- Anything else a lane needs to count, without editing this list. ----
  ui_action: {
    where: "anywhere: action is a short lowercase name chosen in code (a-z, 0-9, _; 2 to 40 characters)",
    consent: "all",
    isNew: true,
    keys: { action: CODE, target: CODE, page: PATH, story_id: ID, n: num(1_000_000), on: BOOL },
  },
} as const satisfies Record<string, EventDefinition>;

export type EventName = keyof typeof EVENTS;

type SpecValue<S> = S extends { kind: "enum"; values: readonly (infer V)[] }
  ? V
  : S extends { kind: "number" }
    ? number
    : S extends { kind: "boolean" }
      ? boolean
      : string;

/** What an event's metadata may hold: only its listed keys, each optional. */
export type EventMetadata<E extends EventName> = {
  [K in keyof (typeof EVENTS)[E]["keys"]]?: SpecValue<(typeof EVENTS)[E]["keys"][K]> | null;
};

export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];
/** Added by this release: the endpoint accepts and cleans these. */
export const NEW_EVENT_NAMES = EVENT_NAMES.filter((name) => EVENTS[name].isNew);
/** Only sent, and only stored, after the visitor chose "Allow". */
export const CONSENT_REQUIRED_EVENTS = EVENT_NAMES.filter((name) => EVENTS[name].consent === "all");

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(EVENTS, value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;
const PATH_PATTERN = /^\/[a-z0-9\-/]{0,80}$/;

function cleanPath(value: string): string | null {
  if (!PATH_PATTERN.test(value)) return null;
  const segments = value.split("/").filter(Boolean);
  if (segments.length > 4) return null;
  // A long run of hex or digits is a key or a record, not a place.
  if (segments.some((segment) => segment.length > 60 || /[0-9a-f]{12,}/.test(segment) || /\d{5,}/.test(segment))) return null;
  return value.length > 1 ? value.replace(/\/+$/, "") || "/" : value;
}

/** One value against its spec: the cleaned value, or undefined to drop it. Pure. */
export function cleanEventValue(spec: ValueSpec, value: unknown): string | number | boolean | undefined {
  switch (spec.kind) {
    case "id":
      return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : undefined;
    case "code":
      return typeof value === "string" && CODE_PATTERN.test(value) ? value : undefined;
    case "path":
      return typeof value === "string" ? cleanPath(value) ?? undefined : undefined;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
      if (value < spec.min || value > spec.max) return undefined;
      return Math.round(value * 100) / 100;
    case "boolean":
      return typeof value === "boolean" ? value : undefined;
    case "enum":
      return typeof value === "string" && spec.values.includes(value) ? value : undefined;
  }
}

/**
 * An event's metadata with every key that is not listed, and every value that
 * does not fit its key, removed. Null for an event that is not on the list.
 * Pure: the browser helper and the endpoint both run it.
 */
export function sanitizeEventMetadata(event: string, raw: unknown): Record<string, string | number | boolean> | null {
  if (!isEventName(event)) return null;
  const keys = EVENTS[event].keys as Record<string, ValueSpec>;
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(keys, key)) continue;
    const kept = cleanEventValue(keys[key], value);
    if (kept !== undefined) clean[key] = kept;
  }
  return clean;
}

/** The list as plain data, for storyloop-ops events.json and anyone reading the numbers. */
export function describeEvents() {
  return EVENT_NAMES.map((name) => {
    const definition: EventDefinition = EVENTS[name];
    return {
      name,
      where: definition.where,
      consent: definition.consent,
      status: definition.isNew ? "new" : "existing, keys extended",
      metadata: Object.fromEntries(
        Object.entries(definition.keys).map(([key, spec]) => [
          key,
          spec.kind === "enum"
            ? { kind: "listed", values: [...spec.values] }
            : spec.kind === "number"
              ? { kind: "number", min: spec.min, max: spec.max }
              : spec.kind === "code"
                ? { kind: "code", pattern: CODE_PATTERN.source }
                : spec.kind === "path"
                  ? { kind: "path", pattern: PATH_PATTERN.source, note: "at most 4 segments; no long hex or digit runs" }
                  : spec.kind === "id"
                    ? { kind: "id", pattern: "UUID" }
                    : { kind: "boolean" },
        ]),
      ),
    };
  });
}
