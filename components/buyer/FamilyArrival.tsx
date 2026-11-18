"use client";

import { useLayoutEffect, useState } from "react";

/**
 * One line on /for-centres for someone who arrived from a family's message
 * (18 Nov 2026, the parent path): /ask-your-centre gives a parent a message for
 * her centre, and its link carries utm_source=family. The page is built ahead
 * of time, so the address is read in the browser. Nothing is stored or sent.
 *
 * A layout effect on purpose: PageTracker reads the campaign and then takes
 * every utm_ parameter out of the address bar in an ordinary effect, and layout
 * effects all run before ordinary ones.
 */
export default function FamilyArrival() {
  const [show, setShow] = useState(false);
  useLayoutEffect(() => {
    try {
      setShow(new URLSearchParams(window.location.search).get("utm_source") === "family");
    } catch {
      /* stay hidden */
    }
  }, []);
  if (!show) return null;
  return (
    <p className="mb-3 inline-flex rounded-full bg-sage-50 px-3 py-1 text-sm font-semibold text-sage-800" data-testid="family-arrival">
      A family at your centre sent you here.
    </p>
  );
}
