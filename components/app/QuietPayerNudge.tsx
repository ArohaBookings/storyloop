"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, PenLine, X } from "lucide-react";
import { track } from "@/lib/analytics/client";

/**
 * In the app, never by email (27 Oct 2026). Leo: "you could do a notification
 * in app and say, you haven't been using it, do you want assistance? But don't
 * email them." Only 3 of 8 paying educators wrote a story in the last 30 days,
 * and paid plans that sit unused are the ones that get cancelled. Shown to a
 * paying educator whose last story was 14 or more days ago (or who has never
 * written one); "Not now" hides it for two weeks on this device.
 */

const DISMISS_KEY = "storyloop_quiet_nudge_until";
const HIDE_DAYS = 14;

export default function QuietPayerNudge({ firstName, daysSince }: { firstName: string; daysSince: number | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      if (until > Date.now()) return;
    } catch {
      /* storage blocked: show it */
    }
    setShow(true);
    track("quiet_nudge_view", { days: daysSince ?? -1 });
  }, [daysSince]);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + HIDE_DAYS * 86_400_000));
    } catch {
      /* fine */
    }
    track("quiet_nudge_dismiss", { days: daysSince ?? -1 });
    setShow(false);
  };

  return (
    <div className="mb-6 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-50 via-white to-sage-50 p-5 shadow-warm" role="region" aria-label="Need a hand?" data-testid="quiet-nudge">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-ink-900">
            {daysSince === null
              ? `Kia ora ${firstName}, your unlimited stories are ready when you are.`
              : `Kia ora ${firstName}, it's been ${daysSince} days since your last story.`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Want a hand? Type or say a two-line note about one child from today and StoryLoop does the rest. If something isn&apos;t working
            for you, tell us and we&apos;ll sort it.
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full p-1.5 text-ink-400 hover:bg-cream-100 hover:text-ink-700" aria-label="Not now">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/generate" onClick={() => track("quiet_nudge_write", { days: daysSince ?? -1 })} className="btn-primary justify-center px-5 py-2.5 text-sm">
          <PenLine className="h-4 w-4" /> Write one now
        </Link>
        <Link href="/support" onClick={() => track("quiet_nudge_help", { days: daysSince ?? -1 })} className="btn-secondary justify-center px-5 py-2.5 text-sm">
          <LifeBuoy className="h-4 w-4" /> Get help
        </Link>
        <button type="button" onClick={dismiss} className="px-3 py-2.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
          Not now
        </button>
      </div>
    </div>
  );
}
