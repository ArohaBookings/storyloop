/**
 * System health, as pure functions over rows the admin page already fetched.
 *
 * The page asks one question per section: is something silently broken that is
 * costing money or trust? Every threshold here is deliberately simple and named,
 * so a red light can always be explained in a sentence.
 */

export type Tone = "ok" | "warn" | "critical";

export type EmailEventRow = { email_type: string; delivery_status: string };

export type EmailTypeSummary = {
  type: string;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

/** Delivery results grouped by email type, worst failure rate first. */
export function summarizeEmailEvents(rows: EmailEventRow[]): {
  byType: EmailTypeSummary[];
  sent: number;
  failed: number;
  skippedUnconfigured: number;
  failureRate: number | null;
} {
  const map = new Map<string, EmailTypeSummary>();
  let sent = 0;
  let failed = 0;
  let skippedUnconfigured = 0;

  for (const row of rows) {
    const type = row.email_type || "unknown";
    const status = row.delivery_status || "unknown";
    const entry = map.get(type) ?? { type, sent: 0, failed: 0, skipped: 0, total: 0 };
    entry.total += 1;
    if (status === "sent") { entry.sent += 1; sent += 1; }
    else if (status === "failed") { entry.failed += 1; failed += 1; }
    else {
      entry.skipped += 1;
      if (status === "skipped_unconfigured") skippedUnconfigured += 1;
    }
    map.set(type, entry);
  }

  const attempted = sent + failed;
  const byType = [...map.values()].sort((a, b) => {
    const rateA = a.sent + a.failed ? a.failed / (a.sent + a.failed) : 0;
    const rateB = b.sent + b.failed ? b.failed / (b.sent + b.failed) : 0;
    return rateB - rateA || b.total - a.total;
  });

  return { byType, sent, failed, skippedUnconfigured, failureRate: attempted ? failed / attempted : null };
}

/**
 * Email health. Any skipped_unconfigured means the Resend key is missing in
 * that environment and NOTHING is being delivered, including payment-failed
 * notices, which is worse than a handful of bounces.
 */
export function emailTone(summary: ReturnType<typeof summarizeEmailEvents>): Tone {
  if (summary.skippedUnconfigured > 0 && summary.sent === 0) return "critical";
  if (summary.failureRate !== null && summary.failureRate >= 0.1) return "critical";
  if (summary.skippedUnconfigured > 0) return "warn";
  if (summary.failureRate !== null && summary.failureRate >= 0.02) return "warn";
  return "ok";
}

/**
 * The landing demo is the top of the funnel. When it errors, a visitor who
 * pressed the button saw a failure instead of a story, and they rarely try
 * twice. Error rate is errors over attempts that reached an outcome.
 */
export function demoReliability(counts: { started: number; completed: number; errors: number }) {
  const started = Math.max(0, counts.started || 0);
  const completed = Math.max(0, counts.completed || 0);
  const errors = Math.max(0, counts.errors || 0);
  const outcomes = completed + errors;
  const errorRate = outcomes ? errors / outcomes : null;
  const tone: Tone = errorRate === null ? "ok" : errorRate >= 0.1 ? "critical" : errorRate >= 0.03 ? "warn" : "ok";
  return { started, completed, errors, errorRate, tone };
}

export type WebhookHealth = {
  total: number;
  processed: number;
  failed: number;
  stuck_processing: number;
};

/**
 * A webhook stuck in 'processing' is worse than a failed one. A failed event is
 * reprocessed on Stripe's retry; a claimed one is skipped as a duplicate until
 * the stale lock recovery migration reclaims it after 15 minutes. Either way it
 * means a handler was killed mid-run, which deserves a human look.
 */
export function webhookTone(health: WebhookHealth | null): Tone {
  if (!health) return "warn";
  if (health.stuck_processing > 0) return "critical";
  if (health.failed > 0) return health.total && health.failed / health.total >= 0.05 ? "critical" : "warn";
  return "ok";
}

export function worstTone(tones: Tone[]): Tone {
  if (tones.includes("critical")) return "critical";
  if (tones.includes("warn")) return "warn";
  return "ok";
}
