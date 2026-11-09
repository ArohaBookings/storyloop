/**
 * How often the blog publishes, as numbers the daily cron can check.
 *
 * The cron runs once a day at the same minute, and a guide is stamped a few
 * seconds after its run began. Measured exactly, "three days apart" is 2.9999
 * days at the next chance and waits a fourth day, and "one in the last 7 days"
 * still counts last week's guide and waits an eighth: 30 Oct to 7 Nov 2026 was
 * 8 days at one a week, and two a week would have been one every 4 days. A
 * quarter of a day of slack makes the pace what it says.
 */
export const BLOG_SLACK_DAYS = 0.25;
/** The window "this week's guides" are counted in. */
export const BLOG_WEEK_WINDOW_DAYS = 7 - BLOG_SLACK_DAYS;
/** The least time between two guides: 3 days at two a week, 6 at one a week. */
export const blogMinGapDays = (perWeek: number) => (perWeek >= 2 ? 3 : 6) - BLOG_SLACK_DAYS;

/** May the daily run publish now? `null` means yes; a string says why not. */
export function blogHoldReason(input: { perWeek: number; publishedInWindow: number; daysSinceLatest: number | null }): string | null {
  const { perWeek, publishedInWindow, daysSinceLatest } = input;
  if (perWeek <= 0) return "no topics left in the backlog";
  if (publishedInWindow >= perWeek) return `${publishedInWindow} published in the last 7 days, this week's pace is ${perWeek}`;
  const minimum = blogMinGapDays(perWeek);
  if (daysSinceLatest !== null && daysSinceLatest < minimum) {
    return `last post was ${daysSinceLatest.toFixed(1)} days ago, minimum is ${minimum + BLOG_SLACK_DAYS}`;
  }
  return null;
}
