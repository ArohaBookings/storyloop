/**
 * Learning stories in numbers: the public, aggregate view of how StoryLoop is
 * actually used.
 *
 * Why it exists: search engines and AI answer engines cite specific, original,
 * dated numbers far more readily than they cite product pages, and StoryLoop is
 * the only source of these particular numbers. Why it is safe: it is counts and
 * medians only, over every non-internal account at once. No text, no names, no
 * per-educator or per-centre figure, and nothing at all until the sample is big
 * enough that no single educator could be picked out of it.
 *
 * Pure: the page passes rows in. Tested in tests/public-stats.test.ts.
 */

export type StatsRow = {
  userId: string;
  observations: string | null;
  storyText: string | null;
  hasCurriculumLinks: boolean;
  privacyIssueCount: number;
  assumptionCount: number;
  inputMethod: string | null;
};

export type PublicStats = {
  stories: number;
  educators: number;
  medianNoteWords: number;
  medianDraftWords: number;
  /** Whole percentages. */
  withCurriculumLinks: number;
  withPrivacyFlag: number;
  withAssumptionsRaised: number;
  /** Notes that were spoken rather than typed. */
  spoken: number;
};

/** Below these, nothing is published. */
export const MIN_STORIES = 100;
export const MIN_EDUCATORS = 20;

function words(text: string | null) {
  return typeof text === "string" ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percent(part: number, whole: number) {
  return whole ? Math.round((100 * part) / whole) : 0;
}

export function computePublicStats(rows: StatsRow[]): PublicStats | null {
  // Drafts of the built-in example note are not real documentation.
  const usable = rows.filter((row) => words(row.storyText) > 0 && row.inputMethod !== "sample");
  const educators = new Set(usable.map((row) => row.userId)).size;
  if (usable.length < MIN_STORIES || educators < MIN_EDUCATORS) return null;

  return {
    stories: usable.length,
    educators,
    medianNoteWords: median(usable.map((row) => words(row.observations)).filter((n) => n > 0)),
    medianDraftWords: median(usable.map((row) => words(row.storyText))),
    withCurriculumLinks: percent(usable.filter((row) => row.hasCurriculumLinks).length, usable.length),
    withPrivacyFlag: percent(usable.filter((row) => row.privacyIssueCount > 0).length, usable.length),
    withAssumptionsRaised: percent(usable.filter((row) => row.assumptionCount > 0).length, usable.length),
    spoken: percent(usable.filter((row) => row.inputMethod === "voice").length, usable.length),
  };
}

/** "About 1 in 20" style phrasing for a percentage, for the sentence version. */
export function oneIn(percentage: number) {
  if (percentage <= 0) return null;
  const n = Math.round(100 / percentage);
  return n <= 1 ? null : `about 1 in ${n}`;
}
