"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import ReviewForm from "@/components/app/ReviewForm";

/**
 * The review ask, under a finished story (lib/review-ask.ts has the why and
 * the rules). The server decides whether to ask and remembers that it did, so
 * this shows at most once a month for an account. One tap on a star is
 * already useful; the sentence is optional and goes to the moderated queue.
 */
export default function StoryReviewAsk({ storyId }: { storyId: string }) {
  const [ask, setAsk] = useState(false);
  const [rating, setRating] = useState(0);
  const [closed, setClosed] = useState(false);
  const [sent, setSent] = useState(false);
  // Read inside the effect without making them dependencies: only a new story
  // should trigger a check.
  const settled = useRef(false);
  useEffect(() => { settled.current = ask || rating > 0; }, [ask, rating]);

  // Stays mounted across stories (the story page keeps it alive through
  // Regenerate), so a half-written review is never thrown away. A new story
  // asks the server again only while nothing is on screen: once the ask is
  // showing or a star has been tapped, it stays as it is.
  useEffect(() => {
    if (!storyId || settled.current) return;
    let active = true;
    fetch("/api/reviews/ask")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data?.ask) setAsk(true); })
      .catch(() => {});
    return () => { active = false; };
  }, [storyId]);

  const rate = (n: number) => {
    setRating(n);
    void fetch("/api/reviews/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: n }),
      keepalive: true,
    }).catch(() => {});
  };

  if (!ask || closed) return null;

  return (
    <section className="relative mt-4 rounded-2xl border border-clay-100 bg-paper p-4 sm:p-5" aria-labelledby="story-review-title" data-testid="story-review-ask">
      {!sent && (
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Not now"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100 hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {rating === 0 ? (
        <>
          <h3 id="story-review-title" className="pr-10 text-sm font-bold text-ink-900">How is StoryLoop working for you?</h3>
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
              <h3 id="story-review-title" className="pr-10 text-sm font-bold text-ink-900">Thanks. Want to say why, in a sentence?</h3>
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
