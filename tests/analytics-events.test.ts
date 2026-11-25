import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONSENT_REQUIRED_EVENTS,
  EVENT_NAMES,
  EVENTS,
  NEW_EVENT_NAMES,
  cleanEventValue,
  describeEvents,
  sanitizeEventMetadata,
} from "../lib/analytics/events";

// The December 2026 release's event list (lib/analytics/events.ts) and the
// helper that fires it (lib/analytics/track-event.ts).

const STORY = "3f2b8c1e-9a4d-4c7b-8e21-6d5a0b9c1f42";

test("every name fits the table and is unique", () => {
  assert.equal(new Set(EVENT_NAMES).size, EVENT_NAMES.length);
  for (const name of EVENT_NAMES) {
    assert.match(name, /^[a-z][a-z0-9_]{2,39}$/, name);
    assert.ok(EVENTS[name].where.length > 10, `${name} says where it fires`);
  }
});

test("the release's events are all on the list", () => {
  for (const name of [
    "app_story_copied", "app_story_edit_started", "app_story_regenerated", "app_export", "family_link_made", "leader_check_sent",
    "app_first_session_open", "app_first_note_started", "app_first_story_done", "keep_story_arrived",
    "wall_shown", "wall_checkout_tap", "wall_dismissed", "wall_reason", "price_reminder_shown", "price_reminder_tap",
    "second_story_offered", "second_story_started", "copy_pack_opened", "copy_pack_copied",
    "review_ask_shown", "review_ask_sent", "review_ask_dismissed", "card_banner_shown", "card_banner_tap",
    "signup_view", "signup_field_focus", "signup_error", "oauth_started", "oauth_returned", "oauth_cancelled",
    "signup_email_link_requested", "signup_submitted", "signup_completed", "signup_left", "signup_bot_check_failed", "signup_draft_carried",
    "guide_drafter_seen", "guide_drafter_started", "guide_drafter_finished", "guide_limit_tap", "exit_question_shown", "exit_question_answered",
    "film_play", "film_switch", "film_complete", "ui_action",
  ]) {
    assert.ok(EVENT_NAMES.includes(name as never), `${name} is missing`);
  }
});

test("the tracking endpoint accepts every name and gates the consent-only ones", () => {
  const route = readFileSync("app/api/track/route.ts", "utf8");
  assert.match(route, /\.\.\.EVENT_NAMES/);
  assert.match(route, /\.\.\.CONSENT_REQUIRED_EVENTS/);
  assert.match(route, /sanitizeEventMetadata\(eventType/);
  assert.ok(CONSENT_REQUIRED_EVENTS.includes("signup_field_focus"));
  assert.ok(CONSENT_REQUIRED_EVENTS.includes("signup_left"));
  assert.ok(CONSENT_REQUIRED_EVENTS.includes("ui_action"));
  assert.ok(!CONSENT_REQUIRED_EVENTS.includes("wall_shown"), "a wall is a funnel step");
});

test("only listed keys survive", () => {
  const clean = sanitizeEventMetadata("app_story_copied", { story_id: STORY, how: "button", text: "Mia built a tower", childName: "Mia", email: "a@b.nz" });
  assert.deepEqual(clean, { story_id: STORY, how: "button" });
});

test("only ids, numbers, yes/no and listed values survive", () => {
  assert.deepEqual(sanitizeEventMetadata("wall_shown", { wall: "story", plan: "educator", currency: "NZD", price: 21, trial_days: 7 }), {
    wall: "story", plan: "educator", currency: "NZD", price: 21, trial_days: 7,
  });
  // A value that is not on the list, a number as text, an object and a typed sentence are all dropped.
  assert.deepEqual(sanitizeEventMetadata("wall_shown", { wall: "Mia's wall", plan: "gold", currency: "USD", price: "21", trial_days: { n: 7 } }), {});
  assert.deepEqual(sanitizeEventMetadata("review_ask_sent", { rating: 9 }), {}, "out of range");
  assert.deepEqual(sanitizeEventMetadata("review_ask_sent", { rating: 4 }), { rating: 4 });
  assert.deepEqual(sanitizeEventMetadata("app_export", { story_id: "not-an-id", format: "csv", stories: Number.NaN }), { format: "csv" });
  assert.deepEqual(sanitizeEventMetadata("signup_left", { last: "typing", seconds: 6.456 }), { last: "typing", seconds: 6.46 });
  assert.deepEqual(sanitizeEventMetadata("signup_error", { code: "pwned_password", side: "server", status: 400, message: "Your password was found in a breach" }), {
    code: "pwned_password", side: "server", status: 400,
  });
});

test("no value can carry an email, a name or a sentence", () => {
  for (const name of EVENT_NAMES) {
    const keys = EVENTS[name].keys as Record<string, unknown>;
    for (const key of Object.keys(keys)) {
      for (const bad of ["educator@centre.nz", "Mia climbed the tree", "Aroha", "MIA", "<script>", "a".repeat(41)]) {
        const kept = sanitizeEventMetadata(name, { [key]: bad }) ?? {};
        assert.ok(!(key in kept), `${name}.${key} kept "${bad}"`);
      }
    }
  }
});

test("ui_action takes a short lowercase name and nothing else", () => {
  assert.deepEqual(sanitizeEventMetadata("ui_action", { action: "open_history_filter", on: true, n: 3 }), { action: "open_history_filter", on: true, n: 3 });
  for (const action of ["Open filter", "open-filter", "o", "a".repeat(41), "1st_tap", "open filter", ""]) {
    assert.deepEqual(sanitizeEventMetadata("ui_action", { action }), {}, action);
  }
});

test("a page path is kept only when it is a place, not a key", () => {
  const spec = { kind: "path" } as const;
  assert.equal(cleanEventValue(spec, "/tlds-examples"), "/tlds-examples");
  assert.equal(cleanEventValue(spec, "/"), "/");
  assert.equal(cleanEventValue(spec, "/for-centres/"), "/for-centres");
  assert.equal(cleanEventValue(spec, "/pricing?utm_source=x"), undefined);
  assert.equal(cleanEventValue(spec, "/family#k=abc"), undefined);
  assert.equal(cleanEventValue(spec, `/stories/${STORY}`), undefined);
  assert.equal(cleanEventValue(spec, "/w/ABC123"), undefined);
  assert.equal(cleanEventValue(spec, "/check/0123456789abcdef"), undefined);
  assert.equal(cleanEventValue(spec, "https://storyloop.space/pricing"), undefined);
});

test("an unknown event is refused, and every key on the list is described", () => {
  assert.equal(sanitizeEventMetadata("story_text", { text: "x" }), null);
  const described = describeEvents();
  assert.equal(described.length, EVENT_NAMES.length);
  for (const event of described) assert.ok(Object.keys(event.metadata).length > 0, event.name);
  assert.ok(NEW_EVENT_NAMES.includes("wall_shown"));
  assert.ok(!NEW_EVENT_NAMES.includes("signup_view"), "existing events keep their existing rows untouched at the endpoint");
});

test("no listed value names another product", () => {
  const values = EVENT_NAMES.flatMap((name) =>
    Object.values(EVENTS[name].keys as Record<string, { kind: string; values?: readonly string[] }>).flatMap((spec) => spec.values ?? []),
  );
  const RIVALS = /\b(story ?park|educa|kinderloop|brightwheel|xplor|famly|chat ?gpt|copilot|gemini)\b/i;
  assert.deepEqual(values.filter((value) => RIVALS.test(value)), []);
});

// The helper, in a pretend browser: what leaves is cleaned, and the
// consent-only events wait for "Allow".
async function withBrowser(cookie: string, run: (sent: Array<{ event: string; metadata: Record<string, unknown> }>) => Promise<void>) {
  const sent: Array<{ event: string; metadata: Record<string, unknown> }> = [];
  const store = () => {
    const map = new Map<string, string>();
    return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  };
  const g = globalThis as Record<string, unknown>;
  const saved = { window: g.window, document: g.document, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  g.window = { location: { pathname: "/generate", search: "" }, localStorage: store(), sessionStorage: store() };
  g.document = { cookie, referrer: "" };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      webdriver: false,
      sendBeacon: (_url: string, blob: Blob) => {
        void blob.text().then((body) => sent.push(JSON.parse(body)));
        return true;
      },
    },
  });
  try {
    await run(sent);
    await new Promise((resolve) => setTimeout(resolve, 20));
  } finally {
    g.window = saved.window;
    g.document = saved.document;
    if (saved.navigator) Object.defineProperty(globalThis, "navigator", saved.navigator);
  }
}

test("trackEvent sends only what the list allows", async () => {
  const { trackEvent } = await import("../lib/analytics/track-event");
  await withBrowser("sl_consent=all", async (sent) => {
    trackEvent("app_story_copied", { story_id: STORY, how: "button", ...({ text: "Mia built a tower" } as object) });
    trackEvent("ui_action", { action: "Open Filter" });
    trackEvent("signup_field_focus", { field: "email" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(sent.length, 3);
    assert.deepEqual(sent[0].metadata, { story_id: STORY, how: "button" });
    assert.equal(sent[0].event, "app_story_copied");
    assert.deepEqual(sent[1].metadata, {}, "a bad action name is dropped, the tap still counts");
    assert.deepEqual(sent[2].metadata, { field: "email" });
  });
});

test("trackEvent holds the consent-only events without Allow", async () => {
  const { trackEvent } = await import("../lib/analytics/track-event");
  await withBrowser("sl_consent=essential", async (sent) => {
    trackEvent("signup_field_focus", { field: "email" });
    trackEvent("signup_left", { last: "untouched", seconds: 4 });
    trackEvent("wall_shown", { wall: "story", plan: "educator", currency: "AUD", price: 19, trial_days: 7 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(sent.map((item) => item.event), ["wall_shown"]);
  });
});

test("where each line came from is recorded as counts only: no text, no note, no name (MERGE2 2d)", () => {
  assert.ok(EVENT_NAMES.includes("leader_sources_counts"));
  assert.ok(!CONSENT_REQUIRED_EVENTS.includes("leader_sources_counts"));
  assert.deepEqual(Object.keys(EVENTS.leader_sources_counts.keys).sort(), ["audience", "backed", "kind", "not_backed", "sentences"]);
  assert.deepEqual(
    sanitizeEventMetadata("leader_sources_counts", { audience: "leader", kind: "story", sentences: 6, backed: 5, not_backed: 1, note: "Mia poured water", text: "Mia was curious.", child: "Mia" }),
    { audience: "leader", kind: "story", sentences: 6, backed: 5, not_backed: 1 },
  );
  assert.deepEqual(sanitizeEventMetadata("leader_sources_counts", { audience: "Mia", kind: "story", sentences: "6", backed: -1 }), { kind: "story" });
  // Both places fire it, with the counts helper and nothing else.
  const panel = readFileSync("components/app/SendToLeader.tsx", "utf8");
  const page = readFileSync("components/marketing/LeaderCheckPage.tsx", "utf8");
  assert.match(panel, /trackEvent\("leader_sources_counts", \{ audience: "mine", kind: props\.kind, \.\.\.sourceCounts\(sourcePiecesOfView\(data\.view\)\) \}\)/);
  assert.match(page, /trackEvent\("leader_sources_counts", \{ audience: "leader", kind: view\.kind, \.\.\.sourceCounts\(sourcePiecesOfView\(view\)\) \}\)/);
  assert.match(page, /if \(preview \|\| countedSources\.current \|\| !view\?\.showSources\) return;/, "never from her preview, once per page");
});
