"use client";
import { useEffect, useRef } from "react";

/**
 * Opens the <details> it sits beside when the page's address points at it
 * (a link such as "Or see a finished example first"), so the jump lands on the
 * whole example, not on its folded first lines. Renders nothing visible.
 */
export default function OpenOnHash({ hash }: { hash: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const open = () => {
      if (window.location.hash !== hash) return;
      const details = marker.current?.parentElement?.querySelector("details");
      if (details) details.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [hash]);
  return <span ref={marker} hidden />;
}
