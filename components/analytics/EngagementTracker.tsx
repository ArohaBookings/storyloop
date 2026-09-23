"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";

/**
 * What people actually do on a page: what they click, how far they read, which
 * sections they see, and how long they stay. This is the data that says why a
 * page converts or doesn't, where page views alone only say that it didn't.
 *
 * Two modes, because the two kinds of page carry different risks:
 *
 * - "marketing": public pages with nothing personal on them. A click records
 *   the control's visible label, its link and the section it sits in.
 * - "app": signed-in pages, where visible text can be a child's name or a line
 *   from a story. A click records ONLY the link path (ids replaced) and an
 *   explicit data-track name. Never text, never a form value.
 *
 * Every listener is passive and every send is a beacon, so none of this can
 * slow a click or break a page. Caps keep one long session from flooding the
 * table.
 */

const MAX_CLICKS = 60;
const DEPTHS = [25, 50, 75, 90];

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

export default function EngagementTracker({ mode = "marketing" }: { mode?: "marketing" | "app" }) {
  const pathname = usePathname();

  useEffect(() => {
    const started = Date.now();
    let clicks = 0;
    let maxDepth = 0;
    const reached = new Set<number>();
    const seen = new Set<string>();
    let exited = false;

    const onClick = (event: MouseEvent) => {
      if (clicks >= MAX_CLICKS) return;
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>("a, button, [data-track], summary, [role='button'], [role='tab']");
      if (!control) return;
      // Inside story or child content, or anything marked private, only an
      // explicit data-track name is recorded, never text or a link. A control
      // there without a name is not recorded at all.
      const name = control.getAttribute("data-track") ?? undefined;
      const privateZone = Boolean(control.closest("[data-private], .story-safe, [contenteditable='true']"));
      if (privateZone && !name) return;
      clicks += 1;
      const section = control.closest<HTMLElement>("[data-section], section[id], header, footer, nav");
      const href = !privateZone && control instanceof HTMLAnchorElement ? cleanPath(control.getAttribute("href")) : undefined;
      track("click", {
        name,
        label: mode === "marketing" && !privateZone ? labelOf(control) : undefined,
        href,
        tag: control.tagName.toLowerCase(),
        section: section?.getAttribute("data-section") ?? section?.id ?? section?.tagName.toLowerCase(),
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

    const exit = () => {
      if (exited) return;
      exited = true;
      track("page_exit", { seconds: Math.round((Date.now() - started) / 1000), max_depth: maxDepth, clicks });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") exit();
    };

    // Which sections were actually on screen, not just rendered.
    let observer: IntersectionObserver | null = null;
    if (mode === "marketing" && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).id || (entry.target as HTMLElement).getAttribute("data-section");
            if (entry.isIntersecting && id && !seen.has(id)) {
              seen.add(id);
              track("section_view", { section: id, seconds: Math.round((Date.now() - started) / 1000) });
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

    return () => {
      exit();
      observer?.disconnect();
      document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      scrollTarget.removeEventListener("scroll", scroller);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", exit);
    };
  }, [pathname, mode]);

  return null;
}
