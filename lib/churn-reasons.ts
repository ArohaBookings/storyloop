/**
 * Why people cancel.
 *
 * The Stripe billing portal already asks, and until now the answer was thrown
 * away. The webhook copies Stripe's cancellation_details onto the cancellation
 * email events (metadata.cancel_feedback, metadata.cancel_comment), and this
 * turns those rows into something a founder can act on.
 *
 * One subscription produces up to two events (cancelled in the portal, then
 * ended at the period end). They are counted once, using the reason from
 * whichever event carries one.
 */

export const STRIPE_CANCEL_FEEDBACK = {
  too_expensive: "Too expensive",
  unused: "Not using it enough",
  switched_service: "Switched to something else",
  missing_features: "Missing features",
  too_complex: "Too complicated",
  low_quality: "Quality not good enough",
  customer_service: "Support",
  other: "Other",
} as const;

export type CancelFeedback = keyof typeof STRIPE_CANCEL_FEEDBACK;

export const MAX_CANCEL_COMMENT = 500;

/** Stripe's cancellation_details, reduced to safe, bounded strings for metadata. */
export function cancellationFeedbackMetadata(details: unknown): { cancel_feedback?: CancelFeedback; cancel_comment?: string } {
  if (!details || typeof details !== "object") return {};
  const { feedback, comment } = details as { feedback?: unknown; comment?: unknown };
  const out: { cancel_feedback?: CancelFeedback; cancel_comment?: string } = {};
  if (typeof feedback === "string" && Object.prototype.hasOwnProperty.call(STRIPE_CANCEL_FEEDBACK, feedback)) {
    out.cancel_feedback = feedback as CancelFeedback;
  }
  if (typeof comment === "string" && comment.trim()) {
    out.cancel_comment = comment.trim().slice(0, MAX_CANCEL_COMMENT);
  }
  return out;
}

export type CancellationEventRow = {
  email_type: string;
  sent_at: string | null;
  metadata: unknown;
};

export type CancellationSummary = {
  cancellations: number;
  withReason: number;
  reasons: Array<{ key: CancelFeedback | "not_given"; label: string; count: number }>;
  comments: Array<{ date: string; label: string | null; comment: string }>;
};

const CANCELLATION_TYPES = new Set(["cancellation_scheduled", "subscription_cancelled"]);

function subscriptionKey(metadata: Record<string, unknown>) {
  const key = typeof metadata.billing_key === "string" ? metadata.billing_key : "";
  // "sub_123" for the ended email, "sub_123:cancel_scheduled:<end>" for the portal one.
  return key.split(":")[0] || null;
}

export function summarizeCancellations(rows: CancellationEventRow[]): CancellationSummary {
  const bySubscription = new Map<string, { date: string; feedback: CancelFeedback | null; comment: string | null }>();

  for (const row of rows) {
    if (!CANCELLATION_TYPES.has(row.email_type)) continue;
    const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
    const key = subscriptionKey(metadata);
    if (!key) continue;
    const parsed = cancellationFeedbackMetadata({ feedback: metadata.cancel_feedback, comment: metadata.cancel_comment });
    const date = (row.sent_at ?? "").slice(0, 10);
    const existing = bySubscription.get(key);
    if (!existing) {
      bySubscription.set(key, { date, feedback: parsed.cancel_feedback ?? null, comment: parsed.cancel_comment ?? null });
      continue;
    }
    // Earliest date is when they decided; any reason given on either event counts.
    if (date && (!existing.date || date < existing.date)) existing.date = date;
    existing.feedback ??= parsed.cancel_feedback ?? null;
    existing.comment ??= parsed.cancel_comment ?? null;
  }

  const counts = new Map<CancelFeedback | "not_given", number>();
  const comments: CancellationSummary["comments"] = [];
  let withReason = 0;
  for (const entry of bySubscription.values()) {
    const key = entry.feedback ?? "not_given";
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (entry.feedback) withReason += 1;
    if (entry.comment) {
      comments.push({ date: entry.date, label: entry.feedback ? STRIPE_CANCEL_FEEDBACK[entry.feedback] : null, comment: entry.comment });
    }
  }

  const reasons = [...counts.entries()]
    .map(([key, count]) => ({ key, label: key === "not_given" ? "No reason given" : STRIPE_CANCEL_FEEDBACK[key], count }))
    // Given reasons first, most common first; "no reason" always last.
    .sort((a, b) => Number(a.key === "not_given") - Number(b.key === "not_given") || b.count - a.count || a.label.localeCompare(b.label));

  comments.sort((a, b) => b.date.localeCompare(a.date));

  return { cancellations: bySubscription.size, withReason, reasons, comments };
}
