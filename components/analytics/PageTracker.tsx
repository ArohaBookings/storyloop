"use client";

import { useEffect } from "react";
import { captureAttribution, track } from "@/lib/analytics/client";
import EngagementTracker from "./EngagementTracker";

/**
 * Records a single page_view (with traffic source) per page load.
 * Mounted on public marketing pages only.
 */
export default function PageTracker({ event = "page_view" }: { event?: string }) {
  useEffect(() => {
    captureAttribution();
    track(event);
    // Intentionally fires once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EngagementTracker mode="marketing" />;
}
