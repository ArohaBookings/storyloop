"use client";

// Tiny first-party funnel tracker. No third-party scripts, nothing that can
// slow down or break a page. How much it records depends on the visitor's
// cookie choice (lib/analytics/consent.ts): without "Allow", only page views
// and funnel steps, against an id that lives in this tab only.

import { consentLevel, fullTracking, type ConsentChoice } from "./consent";

const SESSION_KEY = "storyloop_sid";
const ATTRIBUTION_KEY = "storyloop_attr";
const VISITOR_KEY = "storyloop_visitor";

/** Events that describe behaviour rather than the funnel. Sent only after "Allow". */
export const BEHAVIOUR_EVENTS = new Set([
  "click",
  "scroll_depth",
  "section_view",
  "page_exit",
  "rage_click",
  "copy",
  "form_abandon",
  "js_error",
]);

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPath?: string;
  /** Facebook's click id, when the visit came from a Facebook or Instagram link. */
  fbclid?: string;
  /** When that click landed, in ms. Meta needs it to build the click value. */
  fbclidAt?: number;
};

function localStore(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function tabStore(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Kept between visits only with consent; otherwise this tab only. */
function safeStorage(): Storage | null {
  return fullTracking() ? localStore() : tabStore();
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

let memoryId: string | null = null;

export function getSessionId() {
  const full = fullTracking();
  const store = full ? localStore() : tabStore();
  if (!store) {
    memoryId ??= newId();
    return memoryId;
  }
  let id = store.getItem(SESSION_KEY);
  if (!id && full) {
    // Just allowed: carry on with this tab's id so the visit stays one visit.
    id = tabStore()?.getItem(SESSION_KEY) ?? null;
  }
  if (!id) id = memoryId ?? newId();
  try {
    store.setItem(SESSION_KEY, id);
  } catch {
    /* storage full or blocked */
  }
  memoryId = id;
  return id;
}

/**
 * Called when the visitor makes or changes their choice. Declining removes
 * everything kept between visits; the tab's own id carries on so this visit is
 * still counted once.
 */
export function applyConsent(choice: ConsentChoice) {
  const local = localStore();
  const tab = tabStore();
  if (choice === "essential") {
    try {
      const id = local?.getItem(SESSION_KEY);
      const attribution = local?.getItem(ATTRIBUTION_KEY);
      if (id && !tab?.getItem(SESSION_KEY)) tab?.setItem(SESSION_KEY, id);
      if (attribution && !tab?.getItem(ATTRIBUTION_KEY)) tab?.setItem(ATTRIBUTION_KEY, attribution);
      local?.removeItem(SESSION_KEY);
      local?.removeItem(ATTRIBUTION_KEY);
      local?.removeItem(VISITOR_KEY);
    } catch {
      /* nothing to clear */
    }
    return;
  }
  try {
    const id = tab?.getItem(SESSION_KEY);
    const attribution = tab?.getItem(ATTRIBUTION_KEY);
    if (id && !local?.getItem(SESSION_KEY)) local?.setItem(SESSION_KEY, id);
    if (attribution && !local?.getItem(ATTRIBUTION_KEY)) local?.setItem(ATTRIBUTION_KEY, attribution);
  } catch {
    /* storage blocked */
  }
}

/**
 * With consent, what a page view can say about the visit: the screen, the
 * language and time zone, the connection, and whether this person has been
 * before. Nothing that identifies them.
 */
export function visitContext(): Record<string, unknown> {
  if (typeof window === "undefined" || !fullTracking()) return {};
  const context: Record<string, unknown> = {
    vw: window.innerWidth,
    vh: window.innerHeight,
    dpr: Math.round((window.devicePixelRatio || 1) * 10) / 10,
    lang: navigator.language?.slice(0, 12),
  };
  try {
    context.tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 40);
  } catch {
    /* optional */
  }
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (connection?.effectiveType) context.conn = connection.effectiveType;
  const store = localStore();
  if (store) {
    try {
      const now = Date.now();
      const raw = store.getItem(VISITOR_KEY);
      const visitor = raw ? (JSON.parse(raw) as { first: number; visits: number; last: number }) : { first: now, visits: 0, last: 0 };
      // A new visit after 30 minutes away.
      if (now - visitor.last > 30 * 60 * 1000) visitor.visits += 1;
      visitor.last = now;
      store.setItem(VISITOR_KEY, JSON.stringify(visitor));
      context.visit = visitor.visits;
      context.days_since_first = Math.floor((now - visitor.first) / 86_400_000);
    } catch {
      /* optional */
    }
  }
  return context;
}

/**
 * Capture where this visitor came from the FIRST time we see them, and keep it.
 * Without persisting it, a visitor who lands from an ad, browses, then signs up
 * later looks like direct traffic and the campaign gets no credit.
 */
const TRACKING_PARAMS = ["fbclid", "gclid", "gbraid", "wbraid", "msclkid", "mc_cid", "mc_eid"];

/**
 * Once the campaign has been read, take the tracking parameters out of the
 * address bar, so a link somebody copies and shares is the clean page and not
 * a stranger's ad click. Everything else in the query string is left alone.
 */
function tidyAddressBar() {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || TRACKING_PARAMS.includes(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* cosmetic only */
  }
}

export function captureAttribution(): Attribution {
  const store = safeStorage();
  if (typeof window === "undefined") return {};
  // A referral link can land on any page (the centre link lands on
  // /for-centres). Signup reads this key, so the referrer is credited even when
  // the person browses before signing up. It is part of how referrals work, so
  // it is kept whatever the cookie choice.
  try {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (ref && /^[A-Z2-9]{5,12}$/.test(ref)) localStore()?.setItem("storyloop_ref", ref);
  } catch {
    /* storage blocked: the signup page still reads ?ref= itself */
  }
  const result = readAttribution(store);
  tidyAddressBar();
  return result;
}

function readAttribution(store: Storage | null): Attribution {

  const params = new URLSearchParams(window.location.search);
  // The Facebook click id is last-touch, not first-touch: it only means
  // anything for the click that actually brought someone here. It is only
  // ever sent anywhere if Meta measurement is switched on (lib/meta-capi.ts).
  const fbclid = params.get("fbclid");
  // Only kept with consent, so an ad click is never reported to Meta for a
  // visitor who chose "Essential only".
  const click = fullTracking() && fbclid && /^[A-Za-z0-9_-]{10,500}$/.test(fbclid) ? { fbclid, fbclidAt: Date.now() } : null;

  const existingRaw = store?.getItem(ATTRIBUTION_KEY);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw) as Attribution;
      if (click && click.fbclid !== existing.fbclid) {
        const updated = { ...existing, ...click };
        store?.setItem(ATTRIBUTION_KEY, JSON.stringify(updated));
        return updated;
      }
      return existing;
    } catch {
      /* fall through and re-capture */
    }
  }

  const attribution: Attribution = {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
    landingPath: window.location.pathname,
    ...(click ?? {}),
  };

  // Only persist if there is something worth remembering.
  if (attribution.utmSource || attribution.referrer || attribution.fbclid) {
    store?.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  }
  return attribution;
}

export function getAttribution(): Attribution {
  const raw = localStore()?.getItem(ATTRIBUTION_KEY) ?? tabStore()?.getItem(ATTRIBUTION_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}

export function track(event: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const consent = consentLevel();
  if (consent !== "all" && BEHAVIOUR_EVENTS.has(event)) return;
  const attribution = getAttribution();
  const payload = JSON.stringify({
    event,
    consent,
    sessionId: getSessionId(),
    path: window.location.pathname,
    referrer: attribution.referrer ?? document.referrer ?? undefined,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    metadata,
  });

  try {
    // sendBeacon survives the page being closed mid-navigation, which is
    // exactly when bounce events would otherwise be lost.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
