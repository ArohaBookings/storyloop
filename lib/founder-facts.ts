/**
 * The only place the founder section and the About page get their counts.
 * Never type these numbers into a page.
 *
 * Source: production database, real accounts only (internal accounts removed),
 * counted on 24 November 2026 for the 25 November build (analysis/diagnose.json, "trust").
 * Update all four numbers and the date together, from a fresh count, or not at all.
 */
export const FOUNDER_FACTS = {
  countedOn: "2026-11-24",
  liveSince: "May 2026",
  educatorsWhoWroteAStory: 65,
  learningStoriesWritten: 346,
  teWharikiStories: 221,
  eylfStories: 125,
} as const;

/** "Since May, 65 educators have written 346 learning stories with it: 221 for Te Whāriki and 125 for the EYLF." */
export function founderCountLine(start: string = "Since May"): string {
  const f = FOUNDER_FACTS;
  return `${start}, ${f.educatorsWhoWroteAStory} educators have written ${f.learningStoriesWritten} learning stories with it: ${f.teWharikiStories} for Te Whāriki and ${f.eylfStories} for the EYLF.`;
}
