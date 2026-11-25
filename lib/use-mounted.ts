"use client";
import { useEffect, useState } from "react";

/**
 * False on the server and during hydration, true after the first paint in the browser.
 *
 * Why (25 Nov 2026): History logged React error #418 for any story written before 1pm in
 * New Zealand. The server (UTC) printed one day and the browser (NZ) another, so React threw
 * the page away and drew it again. Dates are printed in UTC until this turns true, then in
 * the reader's own zone (lib/day-label.ts).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
