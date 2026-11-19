"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, SearchCheck } from "lucide-react";
import StoryCheckList from "@/components/app/StoryCheckList";
import { trackEvent } from "@/lib/analytics/track-event";
import { CHECK_NOTE_MAX, CHECK_STORY_MAX } from "@/lib/check-my-story-limits";
import type { StoryCheckResult } from "@/lib/check-my-story";

/** Where "write your next story" goes: the demo, a note box first, no signup to try it. */
export const CHECK_NEXT_STORY_HREF = "/try?utm_source=check_my_story&utm_medium=product";

/**
 * /check-my-story: paste a learning story and the note behind it, see what a
 * leader would query (lib/check-my-story.ts). For educators and leaders who
 * already write stories. The check runs on the server with no model, nothing
 * pasted is kept, and the only button after it leads to writing the next story.
 * Events carry a count and a fixed name only, never the text.
 */
export default function CheckMyStory() {
  const [story, setStory] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState<StoryCheckResult | null>(null);
  const result = useRef<HTMLDivElement>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/check-my-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.check) { setError(data.error ?? "That did not work. Try again."); return; }
      setCheck(data.check as StoryCheckResult);
      trackEvent("ui_action", { action: "check_my_story_run", n: (data.check as StoryCheckResult).looks });
      window.setTimeout(() => result.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError("That did not work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl" data-testid="check-my-story">
      <div className="card min-w-0 p-4 sm:p-6">
        <label htmlFor="check-story" className="block text-sm font-bold text-ink-900">The learning story</label>
        <textarea
          id="check-story"
          value={story}
          onChange={(event) => { setStory(event.target.value); setCheck(null); }}
          rows={6}
          maxLength={CHECK_STORY_MAX}
          className="input mt-1.5 w-full resize-y text-base"
          placeholder="Paste the whole story, curriculum links and all."
          data-testid="check-story-box"
        />
        <label htmlFor="check-note" className="mt-4 block text-sm font-bold text-ink-900">The note it came from</label>
        <textarea
          id="check-note"
          value={note}
          onChange={(event) => { setNote(event.target.value); setCheck(null); }}
          rows={3}
          maxLength={CHECK_NOTE_MAX}
          className="input mt-1.5 w-full resize-y text-base"
          placeholder="What you jotted down at the time."
          data-testid="check-note-box"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy || !story.trim() || !note.trim()}
          className="btn-primary mt-4 w-full justify-center py-3 text-base disabled:opacity-60 sm:w-auto"
          data-testid="check-run"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />} Check it
        </button>
        <p className="mt-2 text-xs leading-relaxed text-ink-500">Nothing you paste is kept. No signup.</p>
        {error && <p role="alert" className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800" data-testid="check-error">{error}</p>}
      </div>

      {check && (
        <div ref={result} className="mt-5 min-w-0 scroll-mt-24" aria-live="polite" data-testid="check-result">
          <p className="font-display text-2xl font-bold text-ink-900" data-testid="check-summary">{check.summary}</p>
          <StoryCheckList check={check} className="mt-3" />
          <Link
            href={CHECK_NEXT_STORY_HREF}
            onClick={() => trackEvent("ui_action", { action: "check_my_story_write" })}
            className="btn-primary mt-5 w-full justify-center py-3 text-base sm:w-auto"
            data-testid="check-next-story"
          >
            Write your next story with StoryLoop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
