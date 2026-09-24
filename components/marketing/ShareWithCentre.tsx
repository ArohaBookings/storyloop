"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { track } from "@/lib/analytics/client";

const LINK = "https://storyloop.space/for-educators";
const MESSAGE = `Hi, I came across StoryLoop, which helps educators write learning stories from a quick note or voice memo (with Te Whāriki or EYLF links), so they take minutes rather than an evening. You still write and check everything, and it works alongside Storypark. It is free for 3 stories a month if anyone wants to try it: ${LINK}`;

/** A ready-made message a family can send their centre. Nothing is sent from here. */
export default function ShareWithCentre() {
  const [copied, setCopied] = useState(false);
  // Known only in the browser, so decided after mount to keep the first render identical.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MESSAGE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      track("cta_click", { name: "family_share_copy" });
    } catch {
      /* the message is on screen to select by hand */
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "StoryLoop", text: MESSAGE });
      track("cta_click", { name: "family_share_native" });
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="rounded-3xl border border-clay-200 bg-white p-5">
      <p className="whitespace-pre-wrap text-base leading-relaxed text-ink-800">{MESSAGE}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={copy} className="btn-primary">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy message"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn-secondary">
            <Share2 className="h-4 w-4" /> Share
          </button>
        )}
      </div>
    </div>
  );
}
