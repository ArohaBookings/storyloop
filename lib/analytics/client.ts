"use client";

// Tiny first-party funnel tracker. No third-party scripts, no cookies beyond a
// single anonymous session id, nothing that can slow down or break a page.

const SESSION_KEY = "storyloop_sid";
const ATTRIBUTION_KEY = "storyloop_attr";

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPath?: string;
};

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSessionId() {
  const store = safeStorage();
  if (!store) return "nostore";
  let id = store.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    store.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Capture where this visitor came from the FIRST time we see them, and keep it.
 * Without persisting it, a visitor who lands from an ad, browses, then signs up
 * later looks like direct traffic and the campaign gets no credit.
 */
export function captureAttribution(): Attribution {
  const store = safeStorage();
  if (typeof window === "undefined") return {};

  const existingRaw = store?.getItem(ATTRIBUTION_KEY);
  if (existingRaw) {
    try {
      return JSON.parse(existingRaw) as Attribution;
    } catch {
      /* fall through and re-capture */
    }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
    landingPath: window.location.pathname,
  };

  // Only persist if there is something worth remembering.
  if (attribution.utmSource || attribution.referrer) {
    store?.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  }
  return attribution;
}

export function getAttribution(): Attribution {
  const store = safeStorage();
  const raw = store?.getItem(ATTRIBUTION_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}

export function track(event: string, metadata: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const attribution = getAttribution();
  const payload = JSON.stringify({
    event,
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
