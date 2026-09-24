import assert from "node:assert/strict";
import test from "node:test";
import { behaviourHeadlines, screenBucket, summariseBehaviour } from "../lib/admin-behaviour";
import type { EventRow } from "../lib/admin-funnel";

const at = (minutes: number) => new Date(Date.UTC(2026, 8, 24, 0, minutes)).toISOString();
const since = new Date(Date.UTC(2026, 8, 1)).toISOString();

function row(event_type: string, session_id: string, metadata: Record<string, unknown> = {}, path = "/", minutes = 0): EventRow {
  return { event_type, session_id, path, metadata, created_at: at(minutes), device: "desktop" };
}

test("the cookie answer: latest answer per visitor, and visitors who never answered", () => {
  const events = [
    row("page_view", "a", { consent: "unset" }),
    row("consent_choice", "a", { choice: "essential" }, "/", 1),
    row("consent_choice", "a", { choice: "all" }, "/", 5), // changed their mind
    row("page_view", "b", { consent: "unset" }),
    row("consent_choice", "b", { choice: "essential" }, "/", 2),
    row("page_view", "c", { consent: "unset" }),
    row("page_view", "old", {}), // before the banner: not counted either way
    row("consent_choice", "server", { choice: "all" }), // server rows ignored
  ];
  const { consent } = summariseBehaviour({ events, sinceIso: since });
  assert.equal(consent.answered, 2);
  assert.equal(consent.allowed, 1);
  assert.equal(consent.essential, 1);
  assert.equal(consent.allowRate, 50);
  assert.equal(consent.visitors, 3);
  assert.equal(consent.neverAnswered, 1);
});

test("where people get stuck, page speed, and attention per section", () => {
  const events = [
    row("rage_click", "a", { label: "See pricing", section: "hero", clickable: true }),
    row("rage_click", "b", { label: "See pricing", section: "hero", clickable: true }),
    row("rage_click", "c", { tag: "img", section: "examples", clickable: false }),
    row("form_abandon", "a", { form: "signup", fields: ["name", "email"], last: "email" }, "/signup"),
    row("js_error", "a", { message: "boom", file: "page.js" }),
    row("page_exit", "a", { seconds: 40, vitals: { lcp: 1800, inp: 120, cls: 0.02, ttfb: 300 }, sections: { hero: 10, pricing: 30 } }),
    row("page_exit", "b", { seconds: 20, vitals: { lcp: 3200, inp: 80, cls: 0.1, ttfb: 500 }, sections: { hero: 6 } }),
    row("page_exit", "c", { seconds: 9 }, "/pricing"),
  ];
  const summary = summariseBehaviour({ events, sinceIso: since });
  assert.deepEqual(summary.rageClicks[0], { key: "See pricing · / › hero", count: 2 });
  assert.match(summary.rageClicks[1].key, /not a button \(img\)/);
  assert.deepEqual(summary.formAbandons[0], { key: '/signup · left at "email"', count: 1 });
  assert.equal(summary.errors[0].key, "boom (page.js)");
  assert.equal(summary.speed.samples, 2);
  assert.equal(summary.speed.lcpMs, 2500);
  assert.equal(summary.speed.slowLoadRate, 50);
  assert.deepEqual(summary.attention[0], { section: "pricing", medianSeconds: 30, visitors: 1 });
  assert.deepEqual(summary.attention[1], { section: "hero", medianSeconds: 8, visitors: 2 });
  const lines = behaviourHeadlines(summary);
  assert.ok(lines.some((line) => line.includes("2.5s")));
  assert.ok(lines.some((line) => line.startsWith("Most frustrated clicking: See pricing")));
});

test("audience comes only from visitors who allowed analytics", () => {
  const events = [
    row("page_view", "a", { consent: "all", vw: 390, browser: "safari", os: "ios", visit: 2, tz: "Pacific/Auckland" }),
    row("page_view", "a", { consent: "all", vw: 390, browser: "safari", os: "ios", visit: 2 }, "/pricing", 3),
    row("page_view", "b", { consent: "all", vw: 1440, browser: "chrome", os: "windows", visit: 1, tz: "Australia/Sydney" }),
    row("page_view", "c", { consent: "essential" }),
  ];
  const { audience } = summariseBehaviour({ events, sinceIso: since });
  assert.equal(audience.sessions, 2);
  assert.equal(audience.returningRate, 50);
  assert.equal(audience.browsers.length, 2);
  assert.equal(screenBucket(390), "phone");
  assert.equal(screenBucket(1440), "laptop");
});
