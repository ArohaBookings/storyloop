"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * The box around a guide's drafter or note box: guide_drafter_seen fires once
 * per page view, when half of it is on screen (25 Nov 2026, B1). It renders
 * exactly the div it is given.
 */
export default function DrafterSeen({ id, className, kind, children }: { id?: string; className?: string; kind: "story" | "statement" | "summary"; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = box.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let sent = false;
    const observer = new IntersectionObserver((entries) => {
      if (sent || !entries.some((entry) => entry.isIntersecting)) return;
      sent = true;
      trackEvent("guide_drafter_seen", { page: window.location.pathname, kind });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [kind]);
  return (
    <div ref={box} id={id} className={className}>
      {children}
    </div>
  );
}
