"use client";

import { useEffect, useRef, useState } from "react";
import { UserCheck, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * "Send this to my leader" (lib/leader-card.ts): mounted under a story only
 * after she copies it. It asks the server once whether to show (the server
 * offers it once ever), and shows quietly in the page, never over it. "Send it
 * to my leader" opens the story's own leader check (the caller's onSend); "No
 * thanks" hides it for good.
 *
 * One prompt per story (lib/one-prompt.ts): canShow false means another card
 * already holds this story's slot, so it does not even ask; onShown tells the
 * page it took the slot; onDeclined tells it the server said no (or could not
 * be asked) for this story, so a copy may count toward the review ask.
 * Events: ui_action with the story's id only.
 */
export default function LeaderCard({
  storyId,
  onSend,
  canShow = true,
  onShown,
  onDeclined,
}: {
  storyId: string;
  onSend: () => void;
  canShow?: boolean;
  onShown?: () => void;
  onDeclined?: () => void;
}) {
  const [show, setShow] = useState(false);
  const asked = useRef("");
  // Read when the answer arrives, without asking again when it changes.
  const shown = useRef(onShown);
  useEffect(() => { shown.current = onShown; }, [onShown]);
  const declined = useRef(onDeclined);
  useEffect(() => { declined.current = onDeclined; }, [onDeclined]);

  useEffect(() => {
    if (!storyId || !canShow || asked.current === storyId) return;
    asked.current = storyId;
    fetch("/api/leader-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check", storyId }) })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.show !== true) {
          declined.current?.();
          return;
        }
        setShow(true);
        shown.current?.();
        trackEvent("ui_action", { action: "leader_card_shown", story_id: storyId });
      })
      .catch(() => declined.current?.());
  }, [storyId, canShow]);

  // Another card took this story's slot first: this one stays out of sight.
  if (!show || !canShow) return null;

  const send = () => {
    trackEvent("ui_action", { action: "leader_card_send", story_id: storyId });
    setShow(false);
    // Scroll once the card has left the page: started together, the panel would
    // land short by the card's own height, its heading off the top of a phone.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => onSend()));
  };

  const noThanks = () => {
    trackEvent("ui_action", { action: "leader_card_no", story_id: storyId });
    setShow(false);
    void fetch("/api/leader-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss" }) }).catch(() => {});
  };

  return (
    <section className="min-w-0 rounded-2xl border border-sage-200 bg-sage-50/70 p-3.5 sm:p-4" aria-label="Send this to your leader" data-testid="leader-card">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-bold text-ink-900">Want your leader to see this one?</p>
        <button type="button" onClick={noThanks} aria-label="No thanks" className="-mr-1 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink-400 hover:bg-sage-100 hover:text-ink-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-ink-700">
        Send it for a quick look. They read it with your note beside it, need no account, and can answer in about two minutes.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={send} className="btn-primary min-h-[44px] px-4 text-sm" data-testid="leader-card-send">
          <UserCheck className="h-4 w-4" /> Send it to my leader
        </button>
        <button type="button" onClick={noThanks} className="btn-ghost min-h-[44px] px-3 text-sm" data-testid="leader-card-no">
          No thanks
        </button>
      </div>
    </section>
  );
}
