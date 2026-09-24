/**
 * The behaviour side of the admin page: the cookie answer, and for visitors who
 * allowed analytics, where they get stuck (rage clicks, unfinished forms,
 * script errors), how fast pages were for them, what they read longest and
 * what they use. Pure, so every number is tested (tests/admin-behaviour.test.ts).
 */

import type { EventRow } from "./admin-funnel";

const SERVER_SESSION = /^(user:|server$)/;

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function topCounts(keys: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
}

export function screenBucket(width: number) {
  if (width < 480) return "phone";
  if (width < 1024) return "tablet or small laptop";
  if (width < 1600) return "laptop";
  return "large screen";
}

export function summariseBehaviour(input: { events: EventRow[]; sinceIso: string }) {
  const since = Date.parse(input.sinceIso);
  const events = input.events.filter((row) => Date.parse(row.created_at) >= since && !SERVER_SESSION.test(row.session_id) && row.device !== "server");
  const meta = (row: EventRow) => (row.metadata ?? {}) as Record<string, unknown>;

  // --- The cookie answer. Latest answer per session wins.
  const answers = new Map<string, string>();
  for (const row of [...events].filter((r) => r.event_type === "consent_choice").sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const choice = str(meta(row).choice);
    if (choice === "all" || choice === "essential") answers.set(row.session_id, choice);
  }
  const allowed = [...answers.values()].filter((choice) => choice === "all").length;
  const essential = answers.size - allowed;
  // Page views since the banner shipped carry the consent level.
  const measuredViews = events.filter((row) => row.event_type === "page_view" && str(meta(row).consent));
  const viewSessions = new Set(measuredViews.map((row) => row.session_id));
  const neverAnswered = [...viewSessions].filter((session) => !answers.has(session)).length;
  const consent = {
    answered: answers.size,
    allowed,
    essential,
    allowRate: pct(allowed, answers.size),
    visitors: viewSessions.size,
    neverAnswered,
    neverAnsweredRate: pct(neverAnswered, viewSessions.size),
  };

  // --- Where people get stuck.
  const rage = events.filter((row) => row.event_type === "rage_click");
  const rageClicks = topCounts(
    rage.map((row) => {
      const m = meta(row);
      const what = str(m.label) ?? str(m.name) ?? (m.clickable === false ? `something that is not a button (${str(m.tag) ?? "?"})` : str(m.tag) ?? "?");
      return `${what} · ${row.path ?? "?"}${str(m.section) ? ` › ${str(m.section)}` : ""}`;
    }),
    8,
  );
  const formAbandons = topCounts(
    events.filter((row) => row.event_type === "form_abandon").map((row) => `${row.path ?? "?"} · left at "${str(meta(row).last) ?? "?"}"`),
    8,
  );
  const errors = topCounts(
    events.filter((row) => row.event_type === "js_error").map((row) => `${str(meta(row).message) ?? "error"}${str(meta(row).file) ? ` (${str(meta(row).file)})` : ""}`),
    6,
  );
  const copies = topCounts(
    events.filter((row) => row.event_type === "copy").map((row) => `${row.path ?? "?"}${str(meta(row).section) ? ` › ${str(meta(row).section)}` : ""}`),
    6,
  );

  // --- Page speed, from the page each visitor actually loaded.
  const exits = events.filter((row) => row.event_type === "page_exit");
  const vitals = exits.map((row) => meta(row).vitals as Record<string, unknown> | undefined).filter((v): v is Record<string, unknown> => Boolean(v && typeof v === "object"));
  const lcps = vitals.map((v) => num(v.lcp)).filter((v): v is number => v != null && v > 0);
  const inps = vitals.map((v) => num(v.inp)).filter((v): v is number => v != null && v > 0);
  const clss = vitals.map((v) => num(v.cls)).filter((v): v is number => v != null);
  const ttfbs = vitals.map((v) => num(v.ttfb)).filter((v): v is number => v != null && v > 0);
  const speed = {
    samples: vitals.length,
    lcpMs: median(lcps),
    slowLoadRate: pct(lcps.filter((v) => v > 2500).length, lcps.length),
    inpMs: median(inps),
    cls: median(clss),
    ttfbMs: median(ttfbs),
  };

  // --- Who they are, broadly, from consented page views.
  const consented = events.filter((row) => row.event_type === "page_view" && meta(row).consent === "all");
  const firstViewPerSession = new Map<string, Record<string, unknown>>();
  for (const row of consented) if (!firstViewPerSession.has(row.session_id)) firstViewPerSession.set(row.session_id, meta(row));
  const sessionsMeta = [...firstViewPerSession.values()];
  const browsers = topCounts(sessionsMeta.map((m) => `${str(m.browser) ?? "?"} on ${str(m.os) ?? "?"}`), 6);
  const screens = topCounts(sessionsMeta.map((m) => num(m.vw)).filter((v): v is number => v != null).map(screenBucket), 4);
  const timezones = topCounts(sessionsMeta.map((m) => str(m.tz)).filter((v): v is string => Boolean(v)), 5);
  const returning = sessionsMeta.filter((m) => (num(m.visit) ?? 1) > 1).length;
  const audience = { sessions: sessionsMeta.length, browsers, screens, timezones, returningRate: pct(returning, sessionsMeta.length) };

  // --- What holds attention on the homepage: median seconds each section was on screen.
  const homeExits = exits.filter((row) => row.path === "/");
  const perSection = new Map<string, number[]>();
  for (const row of homeExits) {
    const sections = meta(row).sections;
    if (!sections || typeof sections !== "object") continue;
    for (const [section, seconds] of Object.entries(sections as Record<string, unknown>)) {
      const value = num(seconds);
      if (value == null) continue;
      perSection.set(section, [...(perSection.get(section) ?? []), value]);
    }
  }
  const attention = [...perSection.entries()]
    .map(([section, values]) => ({ section, medianSeconds: Math.round(median(values) ?? 0), visitors: values.length }))
    .sort((a, b) => b.medianSeconds - a.medianSeconds)
    .slice(0, 10);

  return { consent, rageClicks, formAbandons, errors, copies, speed, audience, attention };
}

/** One plain-English line per finding, most useful first. */
export function behaviourHeadlines(summary: ReturnType<typeof summariseBehaviour>): string[] {
  const lines: string[] = [];
  const { consent, speed, rageClicks, formAbandons, errors, audience } = summary;
  if (consent.answered > 0) {
    lines.push(`${consent.allowRate}% of the ${consent.answered} people who answered the cookie question allowed analytics.`);
  }
  if (consent.visitors > 0 && consent.neverAnswered > 0) {
    lines.push(`${consent.neverAnsweredRate}% of visitors never answered it, so only their page views and sign-up steps are counted.`);
  }
  if (speed.lcpMs != null) {
    const seconds = (speed.lcpMs / 1000).toFixed(1);
    lines.push(
      speed.lcpMs <= 2500
        ? `Pages show their main content in ${seconds}s for a typical visitor, inside Google's 2.5s "good" mark.`
        : `Pages take ${seconds}s to show their main content for a typical visitor, slower than Google's 2.5s "good" mark.`,
    );
  }
  if (rageClicks[0]) lines.push(`Most frustrated clicking: ${rageClicks[0].key} (${rageClicks[0].count} times).`);
  if (formAbandons[0]) lines.push(`Most unfinished form: ${formAbandons[0].key} (${formAbandons[0].count} times).`);
  if (errors[0]) lines.push(`Most common page error: ${errors[0].key} (${errors[0].count} times).`);
  if (audience.returningRate != null && audience.sessions >= 5) lines.push(`${audience.returningRate}% of measured visitors had been here before.`);
  return lines;
}
