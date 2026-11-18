"use client";

import { track } from "./client";
import { consentLevel } from "./consent";
import { EVENTS, sanitizeEventMetadata, type EventMetadata, type EventName } from "./events";

/**
 * Fire one event from the release's list (lib/analytics/events.ts), from any
 * page, signed in or not.
 *
 * This is the explicit path for in-app pages. EngagementTracker's automatic
 * click recording still refuses anything inside a story or a child's details
 * (its private-zone rule, unchanged); a component that wants to count Copy,
 * an edit or an export calls this from its own handler instead, with ids and
 * listed values only. Anything else is dropped here, before it is sent, and
 * again by the endpoint:
 *
 *   trackEvent("app_story_copied", { story_id: story.id, how: "button" });
 *   trackEvent("wall_shown", { wall: "story", plan: "educator", currency: "NZD", price: 21, trial_days: 7 });
 *   trackEvent("ui_action", { action: "open_history_filter" });
 *
 * Never throws and never waits: analytics must not slow or break a tap.
 */
export function trackEvent<E extends EventName>(event: E, metadata: EventMetadata<E> = {} as EventMetadata<E>): void {
  try {
    const clean = sanitizeEventMetadata(event, metadata);
    if (!clean) return;
    // How someone used a form or a control: only after "Allow", like EngagementTracker.
    if (EVENTS[event].consent === "all" && consentLevel() !== "all") return;
    track(event, clean, {});
  } catch {
    /* analytics never breaks a page */
  }
}
