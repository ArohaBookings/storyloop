import { Star } from "lucide-react";
import { listPublishedReviews, reviewSummary } from "@/lib/reviews";

/**
 * Educator reviews on the landing page. Renders nothing at all until at least
 * one review has been published from admin, so the site never shows an empty
 * or fabricated testimonials section.
 */
export default async function Reviews() {
  const [reviews, summary] = await Promise.all([listPublishedReviews(9), reviewSummary()]);
  if (reviews.length === 0) return null;

  const reviewJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://storyloop.space/#software",
    name: "StoryLoop",
    operatingSystem: "Web",
    applicationCategory: "EducationalApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
      description: "Free plan with three learning stories and ten Today Loop moments per month.",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.average,
      ratingCount: summary.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.displayName },
      reviewBody: review.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };

  return (
    <section className="border-y border-clay-100 bg-cream-50 py-20 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }} />
      <div className="wide-shell">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-5 w-5 ${n <= Math.round(summary.average) ? "fill-clay-500 text-clay-500" : "text-clay-200"}`}
              />
            ))}
          </div>
          <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
            {summary.count === 1 ? "What an educator says." : "What educators say."}
          </h2>
          {summary.count > 1 && (
            <p className="mt-3 text-ink-600">
              {summary.average} out of 5 from {summary.count} early childhood educators.
            </p>
          )}
        </div>

        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <figure key={review.id} className="card flex min-w-0 flex-col p-6">
              <div className="mb-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= review.rating ? "fill-clay-500 text-clay-500" : "text-clay-200"}`}
                  />
                ))}
              </div>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-700">
                {review.body}
              </blockquote>
              <figcaption className="mt-4 border-t border-clay-100 pt-3 text-sm">
                <span className="font-bold text-ink-900">{review.displayName}</span>
                {review.role && <span className="text-ink-500">, {review.role}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
