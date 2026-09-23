"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Records one event when it mounts. For moments a server page reaches, like returning from Stripe. */
export default function TrackOnce({ event, metadata = {} }: { event: string; metadata?: Record<string, unknown> }) {
  useEffect(() => {
    track(event, metadata);
    // Once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
