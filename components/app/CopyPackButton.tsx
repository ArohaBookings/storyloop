"use client";

import { ClipboardList } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";
import { COPY_PACK_LABEL } from "@/lib/copy-pack";

/**
 * Right beside Copy, once she has copied (lib/copy-pack.ts): brings up the
 * export packs, the same story laid out for the app her centre uses. Focus goes
 * to the panel itself, never to a button in it.
 */
export default function CopyPackButton({ storyId, targetId, className }: { storyId: string; targetId: string; className: string }) {
  const open = () => {
    trackEvent("copy_pack_opened", { story_id: storyId || null });
    const panel = document.getElementById(targetId);
    if (!panel) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => panel.focus({ preventScroll: true }), reduce ? 0 : 400);
  };
  return (
    <button type="button" onClick={open} className={className} data-testid="copy-pack-open">
      <ClipboardList className="h-3 w-3" /> {COPY_PACK_LABEL}
    </button>
  );
}
