"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";
import { useConsent } from "@/components/consent/useConsent";

/**
 * What people actually do on a page: what they click, how far they read, how
 * long each section holds them, where they get stuck, and how fast the page
 * was for them. This is the data that says why a page converts or doesn't,
 * where page views alone only say that it didn't.
 *
 * Runs only after the visitor chooses "Allow" on the cookie banner. With
 * "Essential only" (or no choice yet) nothing here is recorded at all.
 *
 * Two modes, because the two kinds of page carry different risks:
 *
 * - "marketing": public pages with nothing personal on them. A click records
 *   the control's visible label, its link and the section it sits in. Copying,
 *   form drop-off (field names only, never what was typed) and script errors
 *   are recorded too.
 * - "app": signed-in pages, where visible text can be a child's name or a line
 *   from a story. A click records ONLY the link path (ids replaced) and an
 *   explicit data-track name. Never text, never a form value.
 *
 * Every listener is passive and every send is a beacon, so none of this can
 * slow a click or break a page. Caps keep one long session from flooding the
 * table.
 */

const MAX_CLICKS = 60;
const MAX_ERRORS = 3;
const DEPTHS = [25, 50, 75, 90];

// Page speed is only meaningful for the page the browser actually loaded, not
// for later in-app navigations, so it is measured once per load.
let vitalsTaken = false;

function cleanPath(href: string | null): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return url.hostname.replace(/^www\./, "");
    // UUIDs and long ids in a path are records, not places.
    return url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").replace(/\/\d{3,}/g, "/:id") + (url.hash || "");
  } catch {
    return undefined;
  }
}

function labelOf(element: HTMLElement): string | undefined {
  const aria = element.getAttribute("aria-label");
  const text = (aria || element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 80) : undefined;
}

function sectionOf(element: Element | null): string | undefined {
  const section = element?.closest<HTMLElement>("[data-section], section[id], header, footer, nav");
  return section?.getAttribute("data-section") ?? section?.id ?? section?.tagName.toLowerCase();
}

function fieldName(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  return (field.name || field.id || field.getAttribute("autocomplete") || field.type || field.tagName.toLowerCase()).slice(0, 40);
}

type Vitals = { lcp?: number; cls?: number; inp?: number; ttfb?: number };

function watchVitals(): { read: () => Vitals; stop: () => void } {
  const vitals: Vitals = {};
  const observers: PerformanceObserver[] = [];
  const observe = (type: string, onEntries: (entries: PerformanceEntryList) => void, extra: Record<string, unknown> = {}) => {
    try {
      const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
      observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
      observers.push(observer);
    } catch {
      /* not supported in this browser */
    }
  };
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) vitals.ttfb = Math.round(navigation.responseStart);
  } catch {
    /* optional */
  }
  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) vitals.lcp = Math.round(last.startTime);
  });
  observe("layout-shift", (entries) => {
    for (const entry of entries as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (!entry.hadRecentInput) vitals.cls = Math.round(((vitals.cls ?? 0) + entry.value) * 1000) / 1000;
    }
  });
  // The slowest response to a tap or key press: a close stand-in for INP.
  observe(
    "event",
    (entries) => {
      for (const entry of entries) vitals.inp = Math.max(vitals.inp ?? 0, Math.round(entry.duration));
    },
    { durationThreshold: 40 },
  );
  return { read: () => vitals, stop: () => observers.forEach((observer) => observer.disconnect()) };
}

export default function EngagementTracker({ mode = "marketing" }: { mode?: "marketing" | "app" }) {
  const pathname = usePathname();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "all") return;

    const started = Date.now();
    let clicks = 0;
    let errors = 0;
    let maxDepth = 0;
    const reached = new Set<number>();
    const seen = new Set<string>();
    const dwell = new Map<string, number>();
    const visibleSince = new Map<string, number>();
    const recentClicks: { at: number; x: number; y: number }[] = [];
    let lastRage = 0;
    const forms = new Map<HTMLFormElement, { fields: string[]; last: string; submitted: boolean }>();
    let exited = false;

    const vitals = !vitalsTaken ? watchVitals() : null;
    vitalsTaken = true;

    const onClick = (event: MouseEvent) => {
      // Rage clicks: three or more fast clicks in one spot usually mean
      // something looked clickable and did nothing, or was too slow.
      const now = Date.now();
      recentClicks.push({ at: now, x: event.clientX, y: event.clientY });
      while (recentClicks.length && now - recentClicks[0].at > 800) recentClicks.shift();
      const near = recentClicks.filter((c) => Math.abs(c.x - event.clientX) < 30 && Math.abs(c.y - event.clientY) < 30);
      const target = event.target as HTMLElement | null;
      const privateZone = Boolean(target?.closest("[data-private], .story-safe, [contenteditable='true']"));
      if (near.length >= 3 && now - lastRage > 2000) {
        lastRage = now;
        const control = target?.closest<HTMLElement>("a, button, [data-track], summary, [role='button'], [role='tab']");
        track("rage_click", {
          name: control?.getAttribute("data-track") ?? undefined,
          label: mode === "marketing" && !privateZone && control ? labelOf(control) : undefined,
          tag: (control ?? target)?.tagName.toLowerCase(),
          section: sectionOf(target),
          clickable: Boolean(control),
        });
      }

      if (clicks >= MAX_CLICKS) return;
      const control = target?.closest<HTMLElement>("a, button, [data-track], summary, [role='button'], [role='tab']");
      if (!control) return;
      // Inside story or child content, or anything marked private, only an
      // explicit data-track name is recorded, never text or a link. A control
      // there without a name is not recorded at all.
      const name = control.getAttribute("data-track") ?? undefined;
      if (privateZone && !name) return;
      clicks += 1;
      const href = !privateZone && control instanceof HTMLAnchorElement ? cleanPath(control.getAttribute("href")) : undefined;
      track("click", {
        name,
        label: mode === "marketing" && !privateZone ? labelOf(control) : undefined,
        href,
        tag: control.tagName.toLowerCase(),
        section: sectionOf(control),
        y: Math.round(((window.scrollY + (event.clientY || 0)) / Math.max(1, document.documentElement.scrollHeight)) * 100),
      });
    };

    const scroller = () => {
      const doc = document.documentElement;
      const main = document.querySelector("main");
      // Signed-in pages scroll inside <main>, not the window.
      const scrollTop = mode === "app" && main ? main.scrollTop : window.scrollY;
      const height = mode === "app" && main ? main.scrollHeight - main.clientHeight : doc.scrollHeight - window.innerHeight;
      const depth = height <= 0 ? 100 : Math.min(100, Math.round((scrollTop / height) * 100));
      maxDepth = Math.max(maxDepth, depth);
      for (const mark of DEPTHS) {
        if (depth >= mark && !reached.has(mark)) {
          reached.add(mark);
          track("scroll_depth", { depth: mark });
        }
      }
    };

    // Copying on a public page is a strong signal (a price, a quote, an
    // example). Only where it happened and how much, never the text.
    const onCopy = () => {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement ?? null;
      if (!anchor || anchor.closest("[data-private], .story-safe, form")) return;
      track("copy", { section: sectionOf(anchor), chars: Math.min(5000, selection?.toString().length ?? 0) });
    };

    // Form drop-off: which fields someone reached before leaving without
    // sending. Field names only.
    const onFocus = (event: FocusEvent) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      const form = field.form;
      if (!form || field.type === "hidden") return;
      const entry = forms.get(form) ?? { fields: [], last: "", submitted: false };
      const name = fieldName(field);
      if (!entry.fields.includes(name)) entry.fields.push(name);
      entry.last = name;
      forms.set(form, entry);
    };
    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const entry = forms.get(form);
      if (entry) entry.submitted = true;
    };

    const onError = (event: ErrorEvent) => {
      if (errors >= MAX_ERRORS) return;
      errors += 1;
      let file: string | undefined;
      try {
        file = event.filename ? new URL(event.filename).pathname.split("/").pop()?.slice(0, 80) : undefined;
      } catch {
        file = undefined;
      }
      track("js_error", { message: String(event.message || "error").slice(0, 140), file, line: event.lineno || undefined });
    };

    const closeDwell = () => {
      const now = Date.now();
      for (const [id, since] of visibleSince) dwell.set(id, (dwell.get(id) ?? 0) + (now - since));
      visibleSince.clear();
    };

    const exit = () => {
      if (exited) return;
      exited = true;
      closeDwell();
      const sections = Object.fromEntries(
        [...dwell.entries()]
          .map(([id, ms]) => [id, Math.round(ms / 1000)] as const)
          .filter(([, seconds]) => seconds > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 14),
      );
      const speed = vitals?.read();
      vitals?.stop();
      track("page_exit", {
        seconds: Math.round((Date.now() - started) / 1000),
        max_depth: maxDepth,
        clicks,
        ...(Object.keys(sections).length ? { sections } : {}),
        ...(speed && Object.keys(speed).length ? { vitals: speed } : {}),
      });
      for (const [form, entry] of forms) {
        if (entry.submitted || !entry.fields.length) continue;
        track("form_abandon", {
          form: (form.id || form.getAttribute("name") || form.getAttribute("aria-label") || "form").slice(0, 40),
          fields: entry.fields.slice(0, 12),
          last: entry.last,
        });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") exit();
    };

    // Which sections were actually on screen, and for how long.
    let observer: IntersectionObserver | null = null;
    if (mode === "marketing" && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const now = Date.now();
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).id || (entry.target as HTMLElement).getAttribute("data-section");
            if (!id) continue;
            if (entry.isIntersecting) {
              if (!visibleSince.has(id)) visibleSince.set(id, now);
              if (!seen.has(id)) {
                seen.add(id);
                track("section_view", { section: id, seconds: Math.round((now - started) / 1000) });
              }
            } else if (visibleSince.has(id)) {
              dwell.set(id, (dwell.get(id) ?? 0) + (now - (visibleSince.get(id) ?? now)));
              visibleSince.delete(id);
            }
          }
        },
        { threshold: 0.35 },
      );
      document.querySelectorAll("main section[id], main [data-section]").forEach((node) => observer?.observe(node));
    }

    const scrollTarget: EventTarget = mode === "app" ? document.querySelector("main") ?? window : window;
    document.addEventListener("click", onClick, { capture: true, passive: true });
    scrollTarget.addEventListener("scroll", scroller, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", exit);
    if (mode === "marketing") {
      document.addEventListener("copy", onCopy);
      document.addEventListener("focusin", onFocus);
      document.addEventListener("submit", onSubmit, { capture: true });
      window.addEventListener("error", onError);
    }

    return () => {
      exit();
      observer?.disconnect();
      document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      scrollTarget.removeEventListener("scroll", scroller);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", exit);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("submit", onSubmit, { capture: true } as EventListenerOptions);
      window.removeEventListener("error", onError);
    };
  }, [pathname, mode, consent]);

  return null;
}
