"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import ReviewForm from "@/components/app/ReviewForm";
import { REVIEW_ASK_DELAY_MS } from "@/lib/review-ask";

/**
 * The review ask, at the moment she copies a story (lib/review-ask.ts has the
 * why and the rules). Nothing shows until a copy: `copies` goes up by one each
 * time she copies on this page, and only then is the server asked. It says yes
 * at her second copy at the earliest, never twice in 30 days, and never again
 * after "No thanks"; it remembers that it asked. One tap on a star is already
 * useful; the sentence is optional and goes to the moderated queue.
 */
export default function StoryReviewAsk({ storyId, copies, page = "/generate" }: { storyId: string; copies: number; page?: "/generate" | "/history" }) {
  const [askedFor, setAskedFor] = useState("");
  const [rating, setRating] = useState(0);
  const [closed, setClosed] = useState(false);
  const [sent, setSent] = useState(false);
  // Read inside the effect without making them dependencies: only a new copy
  // should trigger a check, and once the ask is up or answered on this page,
  // it stays as it is (the story page keeps it mounted through Regenerate, so
  // a half-written review is never thrown away).
  const settled = useRef(false);
  useEffect(() => { settled.current = Boolean(askedFor) || rating > 0 || closed; }, [askedFor, rating, closed]);

  useEffect(() => {
    if (copies < 1 || !storyId || settled.current) return;
    let active = true;
    // A moment after the tap, so the copy's own event is stored and counted.
    const timer = window.setTimeout(() => {
      fetch(`/api/reviews/ask?at=copy&story=${encodeURIComponent(storyId)}&page=${encodeURIComponent(page)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (active && data?.ask) setAskedFor(storyId); })
        .catch(() => {});
    }, REVIEW_ASK_DELAY_MS);
    return () => { active = false; window.clearTimeout(timer); };
  }, [copies, storyId, page]);

  const answer = (payload: { rating: number } | { dismiss: true }) => {
    void fetch("/api/reviews/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, story_id: askedFor, page }),
      keepalive: true,
    }).catch(() => {});
  };
  const rate = (n: number) => {
    setRating(n);
    answer({ rating: n });
  };
  const noThanks = () => {
    setClosed(true);
    answer({ dismiss: true });
  };

  if (!askedFor || closed) return null;

  return (
    <section className="relative mb-4 rounded-2xl border border-clay-100 bg-paper p-4 sm:p-5" aria-labelledby={`story-review-title-${askedFor}`} data-testid="story-review-ask">
      {!sent && (
        /* Before a star: No thanks, for good. After one: just close (her rating is kept). */
        <button
          type="button"
          onClick={rating === 0 ? noThanks : () => setClosed(true)}
          aria-label={rating === 0 ? "No thanks, do not ask again" : "Close"}
          data-testid={rating === 0 ? "story-review-no-thanks" : "story-review-close"}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100 hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {rating === 0 ? (
        <>
          <h3 id={`story-review-title-${askedFor}`} className="pr-10 text-sm font-bold text-ink-900">How is StoryLoop working for you?</h3>
          <div className="mt-2 flex items-center gap-0.5" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={false}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => rate(n)}
                data-testid={`story-review-star-${n}`}
                className="group flex h-11 w-11 items-center justify-center rounded-lg"
              >
                <Star className="h-7 w-7 text-clay-200 transition-colors group-hover:fill-clay-500 group-hover:text-clay-500" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {!sent && (
            <>
              <h3 id={`story-review-title-${askedFor}`} className="pr-10 text-sm font-bold text-ink-900">Thanks. Want to say why, in a sentence?</h3>
              <p className="mb-3 mt-1 max-w-xl text-sm leading-relaxed text-ink-600">
                Other educators decide whether to try it from reviews like yours. Good or bad, a sentence or two is plenty.
              </p>
            </>
          )}
          <ReviewForm initialRating={rating} embedded onSent={() => setSent(true)} />
        </>
      )}
    </section>
  );
}
