import {
  isSchoolHoliday,
  latestStartedTerm,
  localDate,
  workingDaysBetween,
  type Jurisdiction,
} from "@/lib/terms";

/**
 * Quiet child radar: which children have had no captured moment for a while.
 *
 * The anti-surveillance version, on purpose. It does not say a child is behind,
 * does not score, and does not rank children against each other. It says one
 * true, checkable thing -- "no captured moments in 9 working days" -- and leaves
 * the judgement to the educator: a noticing problem, or just a quiet week.
 *
 * It improves on the existing Documentation Radar in the two ways that made that
 * one noisy:
 *
 *   It counts WORKING days, and for a service that follows school terms it does
 *   not count school holidays. Calendar days turned every weekend and every
 *   holiday into a false alarm about a real child.
 *
 *   A MOMENT is a saved story OR a Today Loop capture. Counting stories alone
 *   flagged children an educator had in fact noticed several times that week.
 *
 * Pure: no database, no clock. The caller passes today and the moments, so the
 * whole thing is tested exactly.
 */

export type RadarChild = { id: string; name: string };
export type RadarMoment = { childId: string | null; createdAt: string };

export type RadarOptions = {
  today: string | Date;
  jurisdiction: Jurisdiction;
  followsSchoolTerms: boolean;
  /** Working days without a moment before a child is worth noticing. */
  thresholdWorkingDays?: number;
};

export type RadarEntry = {
  childId: string;
  childName: string;
  lastMomentDate: string | null;
  /** Working days since the last moment; null when there has never been one. */
  workingDaysQuiet: number | null;
  momentsThisTerm: number;
};

export type QuietChildRadar = {
  today: string;
  /** True when a term-following service is on a school holiday. */
  onHoliday: boolean;
  threshold: number;
  /** Children worth noticing, alphabetical: an order, not a ranking. */
  worthNoticing: RadarEntry[];
  /** Everyone else. Deliberately given no numbers in the interface. */
  noticedRecently: RadarEntry[];
  termLabel: string | null;
};

export const DEFAULT_QUIET_THRESHOLD = 8;

export function buildQuietChildRadar(
  children: RadarChild[],
  moments: RadarMoment[],
  options: RadarOptions,
): QuietChildRadar {
  const { jurisdiction, followsSchoolTerms } = options;
  const threshold = Math.max(1, Math.round(options.thresholdWorkingDays ?? DEFAULT_QUIET_THRESHOLD));
  const today = localDate(options.today, jurisdiction) ?? new Date().toISOString().slice(0, 10);
  const term = latestStartedTerm(today, jurisdiction);
  const onHoliday = followsSchoolTerms && isSchoolHoliday(today, jurisdiction) === true;

  // Latest moment and this-term count per child, using the moment's LOCAL date.
  const latest = new Map<string, string>();
  const thisTerm = new Map<string, number>();
  for (const moment of moments) {
    if (!moment.childId) continue;
    const day = localDate(moment.createdAt, jurisdiction);
    if (!day || day > today) continue;
    const previous = latest.get(moment.childId);
    if (!previous || day > previous) latest.set(moment.childId, day);
    if (term && day >= term.start && day <= term.end) {
      thisTerm.set(moment.childId, (thisTerm.get(moment.childId) ?? 0) + 1);
    }
  }

  const entries: RadarEntry[] = children.map((child) => {
    const last = latest.get(child.id) ?? null;
    return {
      childId: child.id,
      childName: child.name,
      lastMomentDate: last,
      workingDaysQuiet: last ? workingDaysBetween(last, today, { jurisdiction, followsSchoolTerms }) : null,
      momentsThisTerm: thisTerm.get(child.id) ?? 0,
    };
  });

  const byName = (a: RadarEntry, b: RadarEntry) => a.childName.localeCompare(b.childName, "en");

  // In the holidays nobody is "quiet": the children are not there.
  const quiet = (entry: RadarEntry) =>
    !onHoliday && (entry.workingDaysQuiet === null || entry.workingDaysQuiet >= threshold);

  return {
    today,
    onHoliday,
    threshold,
    worthNoticing: entries.filter(quiet).sort(byName),
    noticedRecently: entries.filter((entry) => !quiet(entry)).sort(byName),
    termLabel: term ? `Term ${term.term} ${term.year}` : null,
  };
}

/** The sentence shown for a child worth noticing. Never a judgement. */
export function quietSentence(entry: RadarEntry, termLabel: string | null): string {
  if (entry.lastMomentDate === null) return "No moments captured yet.";
  const days = entry.workingDaysQuiet ?? 0;
  const base = `No captured moments in ${days} working ${days === 1 ? "day" : "days"}.`;
  if (termLabel && entry.momentsThisTerm === 0) return `${base} None yet in ${termLabel}.`;
  return base;
}
