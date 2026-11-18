"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track-event";

const KEY = "storyloop_first_session_open";
/** An account counts as new for its first day. */
const FIRST_DAY_MS = 24 * 60 * 60 * 1000;
/** Arrived straight from signup. */
const FROM_SIGNUP_MS = 15 * 60 * 1000;

/**
 * The first step of a new account's first session (18 Nov 2026): 11 of 29 new
 * accounts opened the app and never wrote a story, and nothing recorded where
 * they stopped. Once per visit, for an account in its first day that has no
 * story yet: which app page it opened, and whether it came straight from
 * signup. The page path only, never anything typed.
 */
export default function FirstSessionTracker({ noStoryYet, signedUpAt }: { noStoryYet: boolean; signedUpAt: string | null }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!noStoryYet || !signedUpAt) return;
    const age = Date.now() - Date.parse(signedUpAt);
    if (!Number.isFinite(age) || age < 0 || age > FIRST_DAY_MS) return;
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked: still once per page load */
    }
    trackEvent("app_first_session_open", { page: pathname, from_signup: age < FROM_SIGNUP_MS });
    // Once per visit: the first page only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
