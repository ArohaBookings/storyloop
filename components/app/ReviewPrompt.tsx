"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import ReviewForm from "@/components/app/ReviewForm";

const DISMISS_KEY = "storyloop-review-ask-dismissed-until";
const DISMISS_DAYS = 60;

/**
 * Asking for a review where a review can actually happen.
 *
 * The form used to live only on the Support page, which is visited by people
 * with a problem, and after five months StoryLoop had no reviews at all. This
 * asks on the dashboard instead, only once somebody has written a few stories
 * over a few days (the server decides that), as one quiet card rather than a
 * modal. "Not now" hides it for two months on this device.
 *
 * Every rating is welcome and goes to the same moderated queue. A low rating is
 * not steered somewhere private: an ask that only collects the happy ones is a
 * misleading review page, and the ACCC and the Commerce Commission both say so.
 */
export default function ReviewPrompt() {
  const [hidden, setHidden] = useState(true);
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    try {
      const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      setHidden(until > Date.now());
    } catch {
      setHidden(false);
    }
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch { /* it will simply ask again next visit */ }
  };

  if (hidden) return null;

  return (
    <section className="card relative mb-8 p-6 md:p-7" aria-labelledby="review-ask-title" data-testid="review-prompt">
      {!sent && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100 hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {!sent && (
        <>
          <h2 id="review-ask-title" className="pr-10 font-display text-xl font-bold text-ink-900">
            How is StoryLoop working for you?
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-600">
            Other educators decide whether to try it from reviews like yours. Good or bad, a sentence or two is plenty.
          </p>
        </>
      )}
      <div className="mt-4">
        {rating === 0 ? (
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={false}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className="group rounded-lg p-1.5"
              >
                <Star className="h-8 w-8 text-clay-200 transition-colors group-hover:fill-clay-500 group-hover:text-clay-500" />
              </button>
            ))}
          </div>
        ) : (
          <ReviewForm initialRating={rating} embedded onSent={() => setSent(true)} />
        )}
      </div>
    </section>
  );
}
