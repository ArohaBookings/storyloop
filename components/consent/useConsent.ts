"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGED, readConsent, type ConsentChoice } from "@/lib/analytics/consent";

/** The current cookie choice, updated the moment the visitor makes or changes it. */
export function useConsent(): ConsentChoice | null | undefined {
  // undefined until mounted, so server and first client render agree.
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  useEffect(() => {
    setChoice(readConsent());
    const onChange = (event: Event) => setChoice((event as CustomEvent<ConsentChoice>).detail ?? readConsent());
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);
  return choice;
}
