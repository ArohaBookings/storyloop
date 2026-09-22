/**
 * The arithmetic behind the admin charts.
 *
 * Pure, so every number on a dashboard that drives decisions can be tested
 * rather than eyeballed. A chart that is quietly wrong is worse than no chart,
 * because a founder will act on it.
 *
 * COHORT RETENTION IS THE POINT OF THIS FILE. Signups and MRR say what
 * happened; retention says whether it will keep happening. A product where
 * month-one retention is 40% cannot reach NZ$100k MRR by pouring in more
 * traffic, and no amount of acquisition work fixes that. It is the one number
 * that decides whether the growth plan is a plan or a wish.
 */

export type DayBucket = { day: string; value: number };
export type Bar = { label: string; value: number; x: number; y: number; width: number; height: number };

const DAY_MS = 86_400_000;

export const isoDay = (value: string | Date) =>
  (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

export const isoMonth = (value: string | Date) => isoDay(value).slice(0, 7);

/**
 * Count events per day across a window, including the days nothing happened.
 *
 * The empty days are the point: a chart drawn only from days with activity
 * silently compresses a quiet fortnight into a single bar and makes a decline
 * look like a plateau.
 */
export function countByDay(timestamps: Array<string | Date>, days: number, today: string): DayBucket[] {
  const counts = new Map<string, number>();
  for (const stamp of timestamps) {
    const day = isoDay(stamp);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const end = Date.parse(`${today}T00:00:00Z`);
  const out: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ day, value: counts.get(day) ?? 0 });
  }
  return out;
}

/**
 * Lay out bars in a fixed viewBox.
 *
 * The scale always starts at zero. A bar chart with a truncated axis
 * exaggerates every change, which is a fine way to feel busy and a terrible way
 * to decide anything.
 */
export function layoutBars(
  buckets: DayBucket[],
  { width = 600, height = 160, gap = 2 }: { width?: number; height?: number; gap?: number } = {},
): { bars: Bar[]; max: number } {
  if (!buckets.length) return { bars: [], max: 0 };
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);
  const slot = width / buckets.length;
  const barWidth = Math.max(1, slot - gap);

  const bars = buckets.map((bucket, index) => {
    // A zero still gets a hairline, so the day is visibly present and empty
    // rather than absent. It has to be drawn INSIDE the box: sitting it on the
    // baseline put a pixel below the viewBox, which clips in some renderers
    // and shifts the whole chart in others.
    const barHeight = bucket.value === 0 ? 1 : Math.max(1, (bucket.value / max) * height);
    return {
      label: bucket.day,
      value: bucket.value,
      x: index * slot,
      y: height - barHeight,
      width: barWidth,
      height: barHeight,
    };
  });
  return { bars, max };
}

export type CohortRow = {
  /** Month the people in this cohort signed up, YYYY-MM. */
  cohort: string;
  size: number;
  /** Still paying, by months since signup. Index 0 is the signup month. */
  retained: number[];
};

/**
 * Retention by signup month.
 *
 * Counts a person as retained in month N if they were paying at any point in
 * that month, which is the honest reading for a subscription that can be
 * cancelled mid-month: somebody who paid for three weeks and left was retained
 * for that month and not the next.
 *
 * Cohorts that have not finished a month yet are left short rather than padded
 * with zeroes, because a zero and "too early to say" are different facts and
 * only one of them is bad news.
 */
export function buildCohorts(input: {
  people: Array<{ signedUpAt: string; startedPayingAt: string | null; stoppedPayingAt: string | null }>;
  today: string;
  months: number;
}): CohortRow[] {
  const monthIndex = (month: string) => {
    const [year, m] = month.split("-").map(Number);
    return year * 12 + (m - 1);
  };
  const nowIndex = monthIndex(isoMonth(input.today));

  const cohorts = new Map<string, CohortRow>();
  for (const person of input.people) {
    const cohort = isoMonth(person.signedUpAt);
    const start = monthIndex(cohort);
    if (nowIndex - start >= input.months) continue;

    const row = cohorts.get(cohort) ?? { cohort, size: 0, retained: [] };
    row.size += 1;

    if (person.startedPayingAt) {
      const paidFrom = monthIndex(isoMonth(person.startedPayingAt));
      const paidTo = person.stoppedPayingAt ? monthIndex(isoMonth(person.stoppedPayingAt)) : nowIndex;
      for (let month = Math.max(paidFrom, start); month <= Math.min(paidTo, nowIndex); month += 1) {
        const offset = month - start;
        row.retained[offset] = (row.retained[offset] ?? 0) + 1;
      }
    }
    cohorts.set(cohort, row);
  }

  return [...cohorts.values()]
    .map((row) => {
      const elapsed = nowIndex - monthIndex(row.cohort) + 1;
      const retained = Array.from({ length: elapsed }, (_, index) => row.retained[index] ?? 0);
      return { ...row, retained };
    })
    .sort((a, b) => b.cohort.localeCompare(a.cohort));
}

/** A percentage that never divides by zero and never invents precision. */
export function share(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

/**
 * A plain sentence about which way a number is going.
 *
 * Deliberately refuses to call a change in a tiny sample a trend: at these
 * volumes, two signups in a week is noise, and a dashboard that announces
 * "up 100%" about it is training its reader to ignore it.
 */
export function describeTrend(recent: number, previous: number, minimum = 10): string {
  if (recent + previous < minimum) return "Too few to call either way yet.";
  if (previous === 0) return recent > 0 ? "Up from nothing." : "Still nothing.";
  const change = Math.round(((recent - previous) / previous) * 100);
  if (Math.abs(change) < 10) return "About the same as the period before.";
  return change > 0 ? `Up ${change}% on the period before.` : `Down ${Math.abs(change)}% on the period before.`;
}
