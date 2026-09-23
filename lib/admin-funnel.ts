/**
 * The conversion picture for the admin: from a visit to a paying customer,
 * what people click, how far they read, and where they come from. Pure: the
 * admin page reads the rows and this turns them into numbers, so every figure
 * on the page is tested.
 *
 * Sessions are the anonymous browser sessions page events carry. Signups and
 * stories come from profiles, which are the truth for those; the anonymous
 * signup_completed event only says which session (and so which source) a
 * signup came from.
 */

export type EventRow = {
  event_type: string;
  session_id: string;
  user_id?: string | null;
  path?: string | null;
  referrer_host?: string | null;
  utm_source?: string | null;
  device?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  created_at: string | null;
  total_stories?: number | null;
  is_internal?: boolean | null;
};

export type CheckoutRow = { userId: string; status: string; created: number; plan: string };

export type FunnelStep = { key: string; label: string; count: number; rateFromPrevious: number | null };

const SERVER_SESSION = /^(user:|server$)/;

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function sourceOf(row: EventRow) {
  if (row.utm_source) return row.utm_source.toLowerCase();
  const host = (row.referrer_host ?? "").toLowerCase();
  if (!host) return "direct";
  if (/facebook\.com$|fb\.com$|^l\.facebook|^lm\.facebook|^m\.facebook/.test(host) || host.includes("facebook")) return "facebook";
  if (host.includes("google")) return "google";
  if (host.includes("bing")) return "bing";
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("chatgpt") || host.includes("openai")) return "chatgpt";
  if (host.includes("storyloop.space")) return "internal";
  return host;
}

export function summariseFunnel(input: {
  events: EventRow[];
  profiles: ProfileRow[];
  checkouts: CheckoutRow[];
  payingUserIds: Set<string>;
  sinceIso: string;
}) {
  const since = Date.parse(input.sinceIso);
  const events = input.events.filter((row) => Date.parse(row.created_at) >= since);
  const browser = events.filter((row) => !SERVER_SESSION.test(row.session_id) && row.device !== "server");

  const sessionsWith = (predicate: (row: EventRow) => boolean) => new Set(browser.filter(predicate).map((row) => row.session_id));
  const visitors = sessionsWith((row) => row.event_type === "page_view");
  const demo = sessionsWith((row) => ["demo_started", "demo_example_played", "demo_evidence_opened"].includes(row.event_type));
  const signupView = sessionsWith((row) => row.event_type === "signup_view");

  const newProfiles = input.profiles.filter((profile) => !profile.is_internal && profile.created_at && Date.parse(profile.created_at) >= since);
  const newIds = new Set(newProfiles.map((profile) => profile.id));
  const wroteStory = newProfiles.filter((profile) => (profile.total_stories ?? 0) > 0);

  const windowCheckouts = input.checkouts.filter((checkout) => checkout.created * 1000 >= since);
  const openedCheckout = new Set(windowCheckouts.map((checkout) => checkout.userId));
  const completed = new Set(windowCheckouts.filter((checkout) => checkout.status === "complete").map((checkout) => checkout.userId));
  const payingNew = [...completed].filter((id) => input.payingUserIds.has(id));

  const counts: Array<[string, string, number]> = [
    ["visitors", "Visited", visitors.size],
    ["demo", "Tried the demo", demo.size],
    ["signup_view", "Opened signup", signupView.size],
    ["signups", "Signed up", newProfiles.length],
    ["first_story", "Wrote a story", wroteStory.length],
    ["checkout", "Opened checkout", openedCheckout.size],
    ["started", "Started a plan or trial", completed.size],
    ["paying", "Paying or trialing now", payingNew.length],
  ];
  const funnel: FunnelStep[] = counts.map(([key, label, count], index) => ({
    key,
    label,
    count,
    rateFromPrevious: index === 0 ? null : pct(count, counts[index - 1][2]),
  }));

  // Abandoned checkouts: opened, never completed, not merely still open.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const abandoned = windowCheckouts
    .filter((checkout) => checkout.status === "expired" || (checkout.status === "open" && nowSeconds - checkout.created > 3600))
    .filter((checkout) => !completed.has(checkout.userId));
  const abandonedUsers = new Map<string, CheckoutRow>();
  for (const checkout of abandoned) {
    const previous = abandonedUsers.get(checkout.userId);
    if (!previous || previous.created < checkout.created) abandonedUsers.set(checkout.userId, checkout);
  }
  const cancelledSessions = sessionsWith((row) => row.event_type === "checkout_cancelled").size;

  // Clicks, by what was clicked and where.
  const clickMap = new Map<string, { label: string; section: string; count: number; sessions: Set<string> }>();
  for (const row of browser.filter((item) => item.event_type === "click")) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const label = String(meta.name ?? meta.label ?? meta.href ?? meta.tag ?? "unnamed").slice(0, 80);
    const section = String(meta.section ?? "page");
    const key = `${row.path ?? ""}|${section}|${label}`;
    const entry = clickMap.get(key) ?? { label, section: `${row.path ?? ""} · ${section}`, count: 0, sessions: new Set<string>() };
    entry.count += 1;
    entry.sessions.add(row.session_id);
    clickMap.set(key, entry);
  }
  const clicks = [...clickMap.values()]
    .map((entry) => ({ label: entry.label, where: entry.section, clicks: entry.count, sessions: entry.sessions.size }))
    .sort((a, b) => b.sessions - a.sessions || b.clicks - a.clicks)
    .slice(0, 25);

  // Home page: how far people read, which sections they saw, how long they stayed.
  const home = browser.filter((row) => row.path === "/");
  const homeSessions = new Set(home.filter((row) => row.event_type === "page_view").map((row) => row.session_id));
  const depth = [25, 50, 75, 90].map((mark) => ({
    depth: mark,
    percent: pct(new Set(home.filter((row) => row.event_type === "scroll_depth" && Number((row.metadata ?? {}).depth) >= mark).map((row) => row.session_id)).size, homeSessions.size),
  }));
  const sectionMap = new Map<string, Set<string>>();
  for (const row of home.filter((item) => item.event_type === "section_view")) {
    const section = String((row.metadata ?? {}).section ?? "");
    if (!section) continue;
    const set = sectionMap.get(section) ?? new Set<string>();
    set.add(row.session_id);
    sectionMap.set(section, set);
  }
  const sections = [...sectionMap.entries()]
    .map(([section, set]) => ({ section, percent: pct(set.size, homeSessions.size) }))
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
  const homeSeconds = median(home.filter((row) => row.event_type === "page_exit").map((row) => Number((row.metadata ?? {}).seconds) || 0));

  // Where visitors come from, and which sources turn into signups.
  const firstTouch = new Map<string, string>();
  for (const row of [...browser].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
    if (!firstTouch.has(row.session_id)) firstTouch.set(row.session_id, sourceOf(row));
  }
  const signedSessions = sessionsWith((row) => row.event_type === "signup_completed");
  const sourceMap = new Map<string, { sessions: number; signups: number }>();
  for (const session of visitors) {
    const source = firstTouch.get(session) ?? "direct";
    const entry = sourceMap.get(source) ?? { sessions: 0, signups: 0 };
    entry.sessions += 1;
    if (signedSessions.has(session)) entry.signups += 1;
    sourceMap.set(source, entry);
  }
  const sources = [...sourceMap.entries()]
    .map(([source, value]) => ({ source, ...value, rate: pct(value.signups, value.sessions) }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12);

  const deviceMap = new Map<string, { sessions: number; signups: number }>();
  const deviceOf = new Map<string, string>();
  for (const row of browser) if (!deviceOf.has(row.session_id) && row.device) deviceOf.set(row.session_id, row.device);
  for (const session of visitors) {
    const device = deviceOf.get(session) ?? "unknown";
    const entry = deviceMap.get(device) ?? { sessions: 0, signups: 0 };
    entry.sessions += 1;
    if (signedSessions.has(session)) entry.signups += 1;
    deviceMap.set(device, entry);
  }
  const devices = [...deviceMap.entries()].map(([device, value]) => ({ device, ...value, rate: pct(value.signups, value.sessions) }));

  const pageMap = new Map<string, Set<string>>();
  for (const row of browser.filter((item) => item.event_type === "page_view")) {
    const path = row.path ?? "/";
    const set = pageMap.get(path) ?? new Set<string>();
    set.add(row.session_id);
    pageMap.set(path, set);
  }
  const pages = [...pageMap.entries()].map(([path, set]) => ({ path, sessions: set.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 15);

  // Day by day.
  const days = new Map<string, { visitors: Set<string>; signups: number }>();
  const dayOf = (iso: string) => iso.slice(0, 10);
  for (const row of browser.filter((item) => item.event_type === "page_view")) {
    const key = dayOf(row.created_at);
    const entry = days.get(key) ?? { visitors: new Set<string>(), signups: 0 };
    entry.visitors.add(row.session_id);
    days.set(key, entry);
  }
  for (const profile of newProfiles) {
    const key = dayOf(profile.created_at!);
    const entry = days.get(key) ?? { visitors: new Set<string>(), signups: 0 };
    entry.signups += 1;
    days.set(key, entry);
  }
  const daily = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, visitors: value.visitors.size, signups: value.signups }));

  return {
    funnel,
    overall: { visitorToSignup: pct(newProfiles.length, visitors.size), signupToStory: pct(wroteStory.length, newProfiles.length), signupToCheckout: pct([...openedCheckout].filter((id) => newIds.has(id)).length, newProfiles.length) },
    abandoned: [...abandonedUsers.values()].sort((a, b) => b.created - a.created),
    cancelledAtStripe: cancelledSessions,
    clicks,
    depth,
    sections,
    homeSessions: homeSessions.size,
    homeSeconds,
    sources,
    devices,
    pages,
    daily,
  };
}
