import { matchDispositions } from "@/lib/term-weather";

/**
 * The reliever brief: what a stranger needs before 9am, and nothing else.
 *
 * A reliever walks into a room knowing nobody. The centre's answer today is a
 * folder of variable quality, so the room's documentation either stops for the
 * day or arrives generic, and the children who never make a fuss are the ones
 * who go unseen. This assembles a one-page brief from what the team already
 * wrote: who to notice today, what each child is into, languages at home, the
 * next steps already planned, and the last moment that mattered.
 *
 * ASSEMBLY, NOT GENERATION. Every line is copied from a saved story, a capture
 * or a child profile. No model call, so it costs nothing, invents nothing and
 * cannot describe a child the team never wrote about.
 *
 * It is deliberately NOT a full history. A brief that takes fifteen minutes to
 * read is a brief nobody reads before the children arrive.
 */

export type BriefChild = {
  id: string;
  name: string;
  ageGroup: string | null;
  interests: string[] | null;
  homeLanguages: string[] | null;
  /** The educator's own notes on the profile: what settles this child, what to avoid. */
  notes: string | null;
  developmentalFocus: string | null;
};

export type BriefMoment = {
  childId: string | null;
  /** Local date, YYYY-MM-DD. */
  date: string;
  title: string | null;
  summary: string | null;
  dispositions: string[];
  nextSteps: Array<{ text: string; status: string }>;
};

export type BriefEntry = {
  childId: string;
  name: string;
  ageGroup: string | null;
  languages: string[];
  intoRightNow: string[];
  /** Up to two recent moments, most recent first. */
  lastMoments: Array<{ date: string; line: string }>;
  openNextSteps: string[];
  settles: string | null;
  /** True when nothing has been captured for this child lately. */
  needsNoticing: boolean;
  daysSinceLastMoment: number | null;
};

export type RelieverBrief = {
  date: string;
  childCount: number;
  /** Children with no recent moment, in the order a reliever should look for them. */
  noticeToday: string[];
  entries: BriefEntry[];
  /** Plain sentences the reliever can act on without reading everything. */
  headlines: string[];
};

export const MAX_BRIEF_CHILDREN = 30;
export const MOMENTS_PER_CHILD = 2;
/** A child with nothing captured for this many days is worth a look today. */
export const NOTICE_AFTER_DAYS = 7;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function momentLine(moment: BriefMoment) {
  const title = clean(moment.title);
  const summary = clean(moment.summary);
  if (title && summary) return `${title}: ${summary}`;
  if (summary) return summary;
  if (title) return title;
  const dispositions = moment.dispositions.flatMap((phrase) => matchDispositions(phrase));
  return dispositions.length ? `${dispositions[0].charAt(0).toUpperCase()}${dispositions[0].slice(1)} was recorded.` : "A moment was recorded.";
}

export function buildRelieverBrief(input: {
  children: BriefChild[];
  moments: BriefMoment[];
  today: string;
}): RelieverBrief {
  const { today } = input;
  const byChild = new Map<string, BriefMoment[]>();
  for (const moment of input.moments) {
    if (!moment.childId) continue;
    const list = byChild.get(moment.childId) ?? [];
    list.push(moment);
    byChild.set(moment.childId, list);
  }
  for (const list of byChild.values()) list.sort((a, b) => b.date.localeCompare(a.date));

  const entries: BriefEntry[] = input.children
    .slice(0, MAX_BRIEF_CHILDREN)
    .map((child) => {
      const moments = byChild.get(child.id) ?? [];
      const lastDate = moments[0]?.date ?? null;
      const daysSince = lastDate ? Math.max(0, daysBetween(lastDate, today)) : null;
      const openNextSteps = moments
        .flatMap((moment) => moment.nextSteps)
        .filter((step) => step && clean(step.text) && (step.status === "planned" || step.status === "continue"))
        .map((step) => clean(step.text))
        .filter((text, index, list) => list.indexOf(text) === index)
        .slice(0, 2);

      return {
        childId: child.id,
        name: clean(child.name) || "This child",
        ageGroup: clean(child.ageGroup) || null,
        languages: (child.homeLanguages ?? []).map(clean).filter(Boolean),
        intoRightNow: (child.interests ?? []).map(clean).filter(Boolean).slice(0, 3),
        lastMoments: moments.slice(0, MOMENTS_PER_CHILD).map((moment) => ({ date: moment.date, line: momentLine(moment) })),
        openNextSteps,
        // The educator's own words about what this child needs. Never rewritten.
        settles: clean(child.notes) || clean(child.developmentalFocus) || null,
        needsNoticing: daysSince === null || daysSince >= NOTICE_AFTER_DAYS,
        daysSinceLastMoment: daysSince,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const noticeToday = entries.filter((entry) => entry.needsNoticing).map((entry) => entry.name);
  const languagesInRoom = [...new Set(entries.flatMap((entry) => entry.languages).filter((language) => language.toLowerCase() !== "english"))];
  const plannedCount = entries.filter((entry) => entry.openNextSteps.length > 0).length;

  const headlines: string[] = [];
  if (noticeToday.length) {
    headlines.push(
      noticeToday.length === entries.length
        ? "Nothing has been captured for this room lately, so anything you notice helps."
        : `Worth noticing today: ${noticeToday.slice(0, 6).join(", ")}${noticeToday.length > 6 ? ` and ${noticeToday.length - 6} more` : ""}.`,
    );
  } else {
    headlines.push("Every child here has a moment recorded in the last week.");
  }
  if (languagesInRoom.length) headlines.push(`Languages spoken at home in this room: ${languagesInRoom.join(", ")}.`);
  if (plannedCount) headlines.push(`${plannedCount} ${plannedCount === 1 ? "child has" : "children have"} a next step the team already planned.`);
  headlines.push("Write what you saw. Nobody expects you to know the history.");

  return { date: today, childCount: entries.length, noticeToday, entries, headlines };
}
