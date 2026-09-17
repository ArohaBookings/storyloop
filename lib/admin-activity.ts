/**
 * Small pure helpers for the per-user admin view.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Story counts per week, oldest first, ending with the current week.
 *
 * Week boundaries are rolling seven-day windows back from `now` rather than
 * calendar weeks, so "this week" always means the last seven days and a Monday
 * morning never shows an empty current bar that reads as a sudden drop-off.
 * Dates outside the window, in the future, or unparseable are ignored.
 */
export function weeklyBuckets(dates: Array<string | null | undefined>, weeks: number, now: Date): number[] {
  const count = Math.max(0, Math.floor(weeks));
  const buckets = new Array<number>(count).fill(0);
  if (count === 0) return buckets;
  const end = now.getTime();

  for (const raw of dates) {
    if (!raw) continue;
    const time = new Date(raw).getTime();
    if (Number.isNaN(time) || time > end) continue;
    const weeksAgo = Math.floor((end - time) / WEEK);
    if (weeksAgo < 0 || weeksAgo >= count) continue;
    buckets[count - 1 - weeksAgo] += 1;
  }
  return buckets;
}

/**
 * A plain-language read on an account, for the top of the admin view. Ordered
 * so the most urgent line comes first.
 */
export function accountSignals(input: {
  plan: string | null;
  subscriptionStatus: string | null;
  isActive: boolean | null;
  chargedWhileComped: boolean;
  storyCount: number;
  lastStoryAt: string | null;
  now: Date;
}): Array<{ tone: "critical" | "warn" | "good" | "info"; text: string }> {
  const signals: Array<{ tone: "critical" | "warn" | "good" | "info"; text: string }> = [];
  const plan = (input.plan ?? "free").toLowerCase();
  const status = (input.subscriptionStatus ?? "").toLowerCase();
  const paid = plan !== "free";

  if (input.chargedWhileComped) {
    signals.push({
      tone: "critical",
      text: "Stripe subscription is live but the app treats this account as comped or free. The card may be charged for access they do not have. Check Stripe now.",
    });
  }
  if (input.isActive === false) signals.push({ tone: "warn", text: "Login is disabled." });
  if (paid && (status === "past_due" || status === "payment_required")) {
    signals.push({ tone: "warn", text: `Payment problem: ${status.replace("_", " ")}. The payment-failed email should have gone out.` });
  }

  if (input.storyCount === 0) {
    signals.push({
      tone: paid ? "warn" : "info",
      text: paid ? "Paying but has never written a story. Highest cancellation risk on the books." : "Signed up, never wrote a story.",
    });
  } else if (input.lastStoryAt) {
    const days = Math.floor((input.now.getTime() - new Date(input.lastStoryAt).getTime()) / (24 * 60 * 60 * 1000));
    if (Number.isFinite(days) && days >= 30) {
      signals.push({ tone: paid ? "warn" : "info", text: `No story in ${days} days.` });
    } else if (Number.isFinite(days) && days <= 7) {
      signals.push({ tone: "good", text: "Wrote a story this week." });
    }
  }

  const order = { critical: 0, warn: 1, info: 2, good: 3 };
  return signals.sort((a, b) => order[a.tone] - order[b.tone]);
}
