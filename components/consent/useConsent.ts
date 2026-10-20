"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGED, currentConsent, type ConsentChoice } from "@/lib/analytics/consent";

/** The choice that applies (the visitor's answer, or the default where they are), updated the moment they change it. */
export function useConsent(): ConsentChoice | null | undefined {
  // undefined until mounted, so server and first client render agree.
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  useEffect(() => {
    setChoice(currentConsent());
    const onChange = (event: Event) => setChoice((event as CustomEvent<ConsentChoice>).detail ?? currentConsent());
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);
  return choice;
}
