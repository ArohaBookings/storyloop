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
  /** Facebook's click id, when the visit came from a Facebook or Instagram link. */
  fbclid?: string;
  /** When that click landed, in ms. Meta needs it to build the click value. */
  fbclidAt?: number;
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
  // the person browses before signing up.
  try {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
    if (ref && /^[A-Z2-9]{5,12}$/.test(ref)) store?.setItem("storyloop_ref", ref);
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
  const click = fbclid && /^[A-Za-z0-9_-]{10,500}$/.test(fbclid) ? { fbclid, fbclidAt: Date.now() } : null;

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
