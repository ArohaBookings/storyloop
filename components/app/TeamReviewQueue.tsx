"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Loader2, MessageSquareText, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track-event";
import { REVIEW_NOTE_MAX } from "@/lib/centre-team";
import StoryCheckList, { StoryCheckSummary } from "@/components/app/StoryCheckList";
import { agoLabel, waitingCount, whenLabel, type TeamQueueItem, type TeamReviewView } from "@/lib/team-queue";

/**
 * A leader's team review queue (18 Nov 2026): the stories her educators share
 * with her, newest first. One tap marks a story "looks good"; or she leaves a
 * short note, which the author sees on her own story. Nothing else.
 *
 * In the sample team (lib/sample-team.ts) the same cards work on the page
 * only: nothing is saved, sent or counted, and every card says "Sample".
 */
export default function TeamReviewQueue({ items, sample = false }: { items: TeamQueueItem[]; sample?: boolean }) {
  const [reviews, setReviews] = useState<Record<string, TeamReviewView | null>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.review])),
  );

  useEffect(() => {
    // How many were waiting when she opened it. A count, never a story.
    if (!sample) trackEvent("ui_action", { action: "team_queue_open", n: waitingCount(items) });
  }, [items, sample]);

  const waiting = items.filter((item) => !reviews[item.id]).length;

  return (
    <div data-testid={sample ? "team-queue-sample" : "team-queue"}>
      <p className="mb-3 text-sm font-semibold text-ink-700" data-testid="team-queue-waiting">
        {waiting === 0 ? "Nothing waiting. You are up to date." : `${waiting} waiting for you`}
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <QueueCard
            key={item.id}
            item={item}
            review={reviews[item.id] ?? null}
            sample={sample}
            onSaved={(review) => setReviews((current) => ({ ...current, [item.id]: review }))}
          />
        ))}
      </ul>
      {sample && (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          This is the sample team. Nothing you do here is saved or sent.
        </p>
      )}
    </div>
  );
}

function QueueCard({
  item,
  review,
  sample,
  onSaved,
}: {
  item: TeamQueueItem;
  review: TeamReviewView | null;
  sample: boolean;
  onSaved: (review: TeamReviewView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);

  const save = async (status: "looks_good" | "note") => {
    if (busy) return;
    const words = note.trim();
    if (status === "note" && !words) { setError("Write a short note first."); return; }
    setError("");
    if (sample) {
      onSaved({ status, note: status === "note" ? words.slice(0, REVIEW_NOTE_MAX) : null, reviewer: "You", at: new Date().toISOString() });
      setWriting(false); setChanging(false); setNote("");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/centres/team/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: item.id, status, note: status === "note" ? words : undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.review) { setError(data.error ?? "That did not save. Try again."); return; }
      onSaved(data.review as TeamReviewView);
      setWriting(false); setChanging(false); setNote("");
    } catch {
      setError("That did not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const answered = Boolean(review) && !changing;
  const heading = [item.author, item.childName].filter(Boolean).join(" · ");

  return (
    // data-private: a colleague's story and note. The click tracker records nothing inside it (EngagementTracker).
    <li id={`story-${item.id}`} className="card scroll-mt-24 p-4 sm:p-5" data-testid="team-queue-item" data-story-id={item.id} data-private>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {sample && (
          <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-clay-800" data-testid="sample-label">
            Sample
          </span>
        )}
        <p className="min-w-0 text-sm font-semibold text-ink-900">{heading}</p>
        <span className="text-xs text-ink-500">· {agoLabel(item.createdAt)}</span>
        {review && !changing && (
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${review.status === "looks_good" ? "bg-sage-100 text-sage-800" : "bg-cream-100 text-clay-800"}`}
            data-testid="team-queue-state"
          >
            {review.status === "looks_good" ? "Looks good" : "Note sent"}
          </span>
        )}
      </div>

      <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800 ${open ? "" : "line-clamp-4"}`} data-testid="team-queue-story">
        {item.storyText}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4">
        <button type="button" onClick={() => setOpen(!open)} className="min-h-[44px] text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
          {open ? "Show less" : "Read it all"}
        </button>
        {/* Check my story: the one-line answer always, the four questions with Read it all. */}
        {!open && <StoryCheckSummary check={item.check} />}
      </div>
      {open && item.note && (
        <div className="mt-1 rounded-xl bg-cream-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{item.author}&apos;s note</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{item.note}</p>
        </div>
      )}
      {open && <StoryCheckList check={item.check} className="mt-2" />}

      {answered && review ? (
        <div className="mt-3 rounded-xl border border-clay-100 bg-cream-50/60 p-3" data-testid="team-queue-answer">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-800">
            {review.status === "looks_good" ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-sage-700" /> : <MessageSquareText className="mt-0.5 h-4 w-4 flex-none text-clay-700" />}
            <span className="min-w-0">
              {review.status === "looks_good" ? "Looks good" : "Note"}
              {review.reviewer ? `, from ${review.reviewer === "You" ? "you" : review.reviewer}` : ""} {whenLabel(review.at)}.
              {review.status === "note" && review.note && <span className="mt-1 block whitespace-pre-wrap text-ink-700">{review.note}</span>}
            </span>
          </p>
          <button type="button" onClick={() => { setChanging(true); setWriting(false); }} className="mt-1 min-h-[44px] text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">
            Change
          </button>
        </div>
      ) : writing ? (
        <div className="mt-3">
          <label htmlFor={`note-${item.id}`} className="text-xs font-semibold text-ink-700">
            A short note for {item.author}. They see it on their story.
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, REVIEW_NOTE_MAX))}
            rows={3}
            maxLength={REVIEW_NOTE_MAX}
            className="input mt-1 resize-y text-sm"
            placeholder="What worked, and one thing to try next time."
            data-testid="team-queue-note"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => save("note")} disabled={busy || !note.trim()} className="btn-primary px-4 py-2 text-sm" data-testid="team-queue-send-note">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />} Send note
            </button>
            <button type="button" onClick={() => { setWriting(false); setError(""); }} className="btn-ghost px-3 py-2 text-sm">
              <X className="h-4 w-4" /> Cancel
            </button>
            <span className="text-xs text-ink-500">{note.length}/{REVIEW_NOTE_MAX}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => save("looks_good")} disabled={busy} className="btn-primary px-4 py-2 text-sm" data-testid="team-queue-looks-good">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Looks good
          </button>
          <button type="button" onClick={() => { setWriting(true); setError(""); }} disabled={busy} className="btn-secondary px-4 py-2 text-sm" data-testid="team-queue-leave-note">
            <MessageSquareText className="h-4 w-4" /> Leave a note
          </button>
          {changing && (
            <button type="button" onClick={() => setChanging(false)} className="btn-ghost px-3 py-2 text-sm">
              Keep it as it was
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-clay-700">{error}</p>}
    </li>
  );
}
