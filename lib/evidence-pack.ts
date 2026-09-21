/**
 * The evidence pack: what a review visit asks to see, assembled from the
 * documentation a service already has.
 *
 * Centres keep the documentation and then rebuild the evidence by hand, in the
 * fortnight before an assessment, from memory and folders. Everything below is
 * counted from saved stories: how each child is covered, whether the planning
 * cycle closes, where critical reflection is recorded, where families appear,
 * and which curriculum links the term actually shows.
 *
 * COUNTING, NOT JUDGING. It never scores a child, compares children or rates
 * the service. It reports what is recorded and, more usefully, what is missing,
 * so a leader finds the gap before an assessor does. No model call, so it costs
 * nothing and cannot invent evidence, which would be the worst possible defect
 * in a compliance document.
 *
 * It describes a service's own records. It is not a compliance judgement and
 * the page says so.
 */

export type EvidenceStory = {
  id: string;
  childId: string | null;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  title: string | null;
  summary: string | null;
  outcomes: string[];
  dispositions: string[];
  nextSteps: Array<{ text: string; status: string }>;
  reflection: string | null;
  familyVoice: string | null;
};

export type EvidenceChild = { id: string; name: string };

export type CoverageRow = {
  childId: string;
  name: string;
  stories: number;
  lastDate: string | null;
  status: "none" | "thin" | "covered";
};

export type EvidencePack = {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  childCount: number;
  storyCount: number;
  coverage: CoverageRow[];
  /** Stories in the period below which a child's coverage reads as thin. */
  thinCoverage: number;
  cycle: {
    withNextSteps: number;
    revisited: number;
    openNow: number;
    examples: Array<{ story: string; step: string; status: string }>;
  };
  reflection: { count: number; examples: Array<{ story: string; text: string }> };
  family: { count: number; examples: Array<{ story: string; text: string }> };
  curriculum: Array<{ link: string; stories: number }>;
  /** Plain sentences naming what is missing, worst first. */
  gaps: string[];
  strengths: string[];
};

/**
 * What counts as thin coverage for one child scales with the period, because a
 * fixed number lies at one end or the other: two stories is reasonable across a
 * term and plainly thin across a year, and a pack that called the second one
 * "covered" would hide exactly the gap it exists to find. Roughly one story a
 * month, never asking for less than two or more than six.
 */
export function thinCoverageFor(periodStart: string, periodEnd: string) {
  const days = Math.round((Date.parse(`${periodEnd}T00:00:00Z`) - Date.parse(`${periodStart}T00:00:00Z`)) / 86_400_000) + 1;
  if (!Number.isFinite(days)) return 2;
  return Math.min(6, Math.max(2, Math.round(days / 30)));
}

const EXAMPLES = 3;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");
const storyName = (story: EvidenceStory) => clean(story.title) || clean(story.summary).slice(0, 60) || `Story ${story.date}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function buildEvidencePack(input: {
  children: EvidenceChild[];
  stories: EvidenceStory[];
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  thinCoverage?: number;
}): EvidencePack {
  const { periodStart, periodEnd } = input;
  const thin = input.thinCoverage ?? thinCoverageFor(periodStart, periodEnd);
  const stories = input.stories
    .filter((story) => story.date >= periodStart && story.date <= periodEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byChild = new Map<string, EvidenceStory[]>();
  for (const story of stories) {
    if (!story.childId) continue;
    byChild.set(story.childId, [...(byChild.get(story.childId) ?? []), story]);
  }

  const coverage: CoverageRow[] = input.children
    .map((child) => {
      const childStories = byChild.get(child.id) ?? [];
      const lastDate = childStories.length ? childStories[childStories.length - 1].date : null;
      return {
        childId: child.id,
        name: clean(child.name) || "Unnamed child",
        stories: childStories.length,
        lastDate,
        status: (childStories.length === 0 ? "none" : childStories.length < thin ? "thin" : "covered") as CoverageRow["status"],
      };
    })
    .sort((a, b) => a.stories - b.stories || a.name.localeCompare(b.name));

  // The planning cycle: a next step recorded, and then actually revisited.
  const withNextSteps = stories.filter((story) => story.nextSteps.some((step) => clean(step.text)));
  const revisited = withNextSteps.filter((story) => story.nextSteps.some((step) => step.status === "tried" || step.status === "continue"));
  const openNow = stories.flatMap((story) => story.nextSteps).filter((step) => clean(step.text) && step.status === "planned").length;
  const cycleExamples = revisited.slice(-EXAMPLES).map((story) => {
    const step = story.nextSteps.find((s) => s.status === "tried" || s.status === "continue")!;
    return { story: storyName(story), step: clean(step.text), status: step.status };
  });

  const reflections = stories.filter((story) => clean(story.reflection));
  const familyStories = stories.filter((story) => clean(story.familyVoice));

  const curriculumCounts = new Map<string, number>();
  for (const story of stories) {
    for (const link of new Set(story.outcomes.map(clean).filter(Boolean))) {
      curriculumCounts.set(link, (curriculumCounts.get(link) ?? 0) + 1);
    }
  }
  const curriculum = [...curriculumCounts.entries()]
    .map(([link, count]) => ({ link, stories: count }))
    .sort((a, b) => b.stories - a.stories || a.link.localeCompare(b.link));

  // What a leader should fix before somebody else finds it, worst first.
  const gaps: string[] = [];
  const noStories = coverage.filter((row) => row.status === "none");
  const thinRows = coverage.filter((row) => row.status === "thin");
  if (noStories.length) {
    gaps.push(`${plural(noStories.length, "child", "children")} with no story recorded this period: ${noStories.map((row) => row.name).join(", ")}.`);
  }
  if (thinRows.length) {
    const how = thin === 2 ? "only one story" : `fewer than ${thin} stories`;
    gaps.push(`${plural(thinRows.length, "child", "children")} with ${how}: ${thinRows.map((row) => row.name).join(", ")}.`);
  }
  if (stories.length && withNextSteps.length < stories.length) {
    gaps.push(`${plural(stories.length - withNextSteps.length, "story", "stories")} with no next step recorded, so the planning cycle stops at the observation.`);
  }
  if (withNextSteps.length && revisited.length === 0) {
    gaps.push("No next step has been marked as tried or worth continuing, so nothing shows what happened after the plan.");
  }
  if (stories.length && reflections.length === 0) {
    gaps.push("No educator reflection is recorded on any story this period.");
  }
  if (stories.length && familyStories.length === 0) {
    gaps.push("No family voice is recorded on any story this period.");
  }
  if (!stories.length) gaps.push("No stories were saved in this period, so there is nothing to show yet.");

  const strengths: string[] = [];
  const covered = coverage.filter((row) => row.status === "covered").length;
  if (covered) strengths.push(`${plural(covered, "child", "children")} with ${thin} or more stories this period.`);
  if (revisited.length) strengths.push(`${plural(revisited.length, "story", "stories")} where a next step was revisited, which is the planning cycle closing.`);
  if (reflections.length) strengths.push(`${plural(reflections.length, "story", "stories")} carrying an educator reflection.`);
  if (familyStories.length) strengths.push(`${plural(familyStories.length, "story", "stories")} carrying a family's own words.`);
  if (curriculum.length) strengths.push(`${plural(curriculum.length, "curriculum link", "curriculum links")} appear across the period.`);

  return {
    periodLabel: input.periodLabel,
    periodStart,
    periodEnd,
    childCount: input.children.length,
    storyCount: stories.length,
    coverage,
    thinCoverage: thin,
    cycle: { withNextSteps: withNextSteps.length, revisited: revisited.length, openNow, examples: cycleExamples },
    reflection: { count: reflections.length, examples: reflections.slice(-EXAMPLES).map((story) => ({ story: storyName(story), text: clean(story.reflection) })) },
    family: { count: familyStories.length, examples: familyStories.slice(-EXAMPLES).map((story) => ({ story: storyName(story), text: clean(story.familyVoice) })) },
    curriculum,
    gaps,
    strengths,
  };
}
