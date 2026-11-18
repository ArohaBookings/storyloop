import { CheckCircle2, MessageSquareText } from "lucide-react";
import { whenLabel, type AuthorReviewView } from "@/lib/team-queue";

/**
 * What the author sees on her own story when a leader answered it in team
 * stories (18 Nov 2026): "looks good", or the leader's short note. Compact is
 * the line on the closed story in Story history, so it is seen without
 * opening anything.
 */
export default function CentreReviewNote({ review, compact = false }: { review: AuthorReviewView; compact?: boolean }) {
  const who = review.reviewer ?? (review.centreName ? `${review.centreName}` : "Your centre");
  if (compact) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${review.status === "looks_good" ? "bg-sage-100 text-sage-800" : "bg-cream-100 text-clay-800"}`}
        data-testid="centre-review-badge"
      >
        {review.status === "looks_good" ? `Looks good · ${who}` : `Note from ${who}`}
      </span>
    );
  }
  return (
    <section className="mt-5 rounded-2xl border border-sage-200 bg-sage-50 p-4" data-testid="centre-review-note">
      <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-sage-900">
        {review.status === "looks_good" ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <MessageSquareText className="mt-0.5 h-4 w-4 flex-none" />}
        <span className="min-w-0">
          {review.status === "looks_good"
            ? `${who} read this ${whenLabel(review.at)} and marked it: looks good.`
            : `${who} left you a note ${whenLabel(review.at)}:`}
        </span>
      </p>
      {review.status === "note" && review.note && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{review.note}</p>
      )}
    </section>
  );
}
