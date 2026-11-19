import { Star } from "lucide-react";
import { listPublishedReviews } from "@/lib/reviews";

/**
 * Real reviews, for public pages such as signup (proposal U, 18 Nov 2026).
 *
 * Only reviews StoryLoop has published from admin (the reviews table, status
 * "published"), shown as written, with the name shortened the way the
 * reviewer chose. Renders nothing at all until one exists: never a made-up
 * review, never a placeholder, and never a number (no count of reviews, no
 * average, no "educators use it"), so nothing here can be counted up.
 */
export default async function ReviewProof({ limit = 2, className = "" }: { limit?: number; className?: string }) {
  const reviews = await listPublishedReviews(Math.max(1, Math.min(limit, 3)));
  if (reviews.length === 0) return null;

  return (
    <section aria-label="What educators say" className={`bg-paper px-4 pb-10 pt-4 ${className}`} data-testid="review-proof">
      <div className="mx-auto grid w-full max-w-md min-w-0 gap-3">
        {reviews.map((review) => (
          <figure key={review.id} className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} aria-hidden="true" className={`h-4 w-4 ${n <= review.rating ? "fill-clay-500 text-clay-500" : "text-clay-200"}`} />
              ))}
            </div>
            <blockquote className="story-safe text-sm leading-relaxed text-ink-700">{review.body}</blockquote>
            <figcaption className="mt-2 text-xs text-ink-600">
              <span className="font-bold text-ink-900">{review.displayName}</span>
              {review.role && <span>, {review.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
