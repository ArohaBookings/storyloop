"use client";

import { useEffect } from "react";
import { captureAttribution, track, visitContext } from "@/lib/analytics/client";
import EngagementTracker, { type EngagementMode } from "./EngagementTracker";

/**
 * Records a single page_view (with traffic source) per page load.
 * Mounted on public pages. Screen, language and returning-visit details ride
 * along only when the visitor has allowed analytics cookies.
 *
 * `mode="private"` on pages that show a child's story to someone without an
 * account (/family, /check, /w/[code], /join): the visit and taps are counted,
 * nothing on the page is (see EngagementTracker).
 */
export default function PageTracker({
  event = "page_view",
  mode = "marketing",
  path,
}: {
  event?: string;
  mode?: "marketing" | "private";
  /** File the page under this instead of its address, when the address holds a code (/w/:code). */
  path?: string;
}) {
  useEffect(() => {
    captureAttribution();
    track(event, visitContext(), path ? { path } : {});
    // Intentionally fires once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EngagementTracker mode={mode as EngagementMode} path={path} />;
}
