/**
 * School term calendars for New Zealand and each Australian state and territory.
 *
 * Why an early childhood product needs them: kindergartens and preschools close
 * in school holidays, and many families' routines follow the school year even
 * where a centre stays open. A "this child has had no captured moments in eight
 * working days" signal that ignores a two-week holiday is not a signal, it is a
 * false alarm about a real child. Term boundaries also define "this term" for
 * term reports, and Term 4 is transition-to-school season on both sides of the
 * Tasman.
 *
 * PROVENANCE, recorded per year so nobody mistakes a date for more certain than
 * it is. Verified 2026-09-17:
 *
 *   official    read from the education department's own page
 *   aggregator  read from a term-date aggregator. Cross-checked by comparing the
 *               same source's Victorian 2026 dates with the Victorian
 *               government's page: identical, all eight dates.
 *
 * Known imprecision, deliberately tolerated: some official dates include staff
 * development days (NSW says so explicitly), so children may start a day or two
 * after the stored date. New Zealand schools set their own Term 1 start and
 * Term 4 end within a window; the stored start is the LATEST permitted, so a
 * holiday is never cut short by a school that started early.
 *
 * MISSING DATA IS SAFE. Where a year is absent, isSchoolHoliday answers null
 * (unknown) and workingDaysBetween simply counts weekdays. A missing calendar can
 * therefore only ever make a quiet-child signal appear sooner, never hide a
 * child. termCoverageGaps() reports what needs adding before it matters.
 */

export type Jurisdiction = "NZ" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

export type Term = {
  term: 1 | 2 | 3 | 4;
  /** First day, YYYY-MM-DD, local calendar date. */
  start: string;
  /** Last day, YYYY-MM-DD, local calendar date. */
  end: string;
};

export type TermYear = {
  year: number;
  source: "official" | "aggregator";
  sourceUrl: string;
  terms: Term[];
};

const NZ_MOE = "https://www.education.govt.nz/school-terms-and-holidays-dates";
const CORAISE_2026 = "https://www.coraise.com.au/blog/australian-school-term-dates-2026";
const NSW_OFFICIAL = "https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates";
const VIC_OFFICIAL = "https://www.vic.gov.au/school-term-dates-and-holidays-victoria";

const t = (term: 1 | 2 | 3 | 4, start: string, end: string): Term => ({ term, start, end });

export const TERM_CALENDARS: Record<Jurisdiction, TermYear[]> = {
  NZ: [
    {
      year: 2026, source: "official", sourceUrl: NZ_MOE,
      // Term 1 may start any day from 26 Jan to 9 Feb; stored as the latest.
      terms: [t(1, "2026-02-09", "2026-04-02"), t(2, "2026-04-20", "2026-07-03"), t(3, "2026-07-20", "2026-09-25"), t(4, "2026-10-12", "2026-12-18")],
    },
    {
      year: 2027, source: "official", sourceUrl: NZ_MOE,
      // Term 1 may start any day from 28 Jan to 3 Feb. Term 2 starts on the
      // Tuesday because Anzac Day falls on Sunday and is observed on Monday.
      terms: [t(1, "2027-02-03", "2027-04-09"), t(2, "2027-04-27", "2027-07-02"), t(3, "2027-07-19", "2027-09-24"), t(4, "2027-10-11", "2027-12-17")],
    },
  ],
  NSW: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-02-02", "2026-04-02"), t(2, "2026-04-22", "2026-07-03"), t(3, "2026-07-21", "2026-09-25"), t(4, "2026-10-13", "2026-12-17")],
    },
    {
      year: 2027, source: "official", sourceUrl: NSW_OFFICIAL,
      // Eastern Division. Official dates include staff development days.
      terms: [t(1, "2027-01-28", "2027-04-09"), t(2, "2027-04-27", "2027-07-02"), t(3, "2027-07-19", "2027-09-24"), t(4, "2027-10-11", "2027-12-20")],
    },
  ],
  VIC: [
    {
      year: 2026, source: "official", sourceUrl: VIC_OFFICIAL,
      terms: [t(1, "2026-01-27", "2026-04-02"), t(2, "2026-04-20", "2026-06-26"), t(3, "2026-07-13", "2026-09-18"), t(4, "2026-10-05", "2026-12-18")],
    },
    {
      year: 2027, source: "official", sourceUrl: VIC_OFFICIAL,
      terms: [t(1, "2027-01-27", "2027-03-25"), t(2, "2027-04-12", "2027-06-25"), t(3, "2027-07-12", "2027-09-17"), t(4, "2027-10-04", "2027-12-17")],
    },
  ],
  QLD: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-01-27", "2026-04-02"), t(2, "2026-04-20", "2026-06-26"), t(3, "2026-07-13", "2026-09-18"), t(4, "2026-10-06", "2026-12-11")],
    },
  ],
  SA: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-01-27", "2026-04-10"), t(2, "2026-04-27", "2026-07-03"), t(3, "2026-07-20", "2026-09-25"), t(4, "2026-10-12", "2026-12-11")],
    },
  ],
  WA: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-02-02", "2026-04-02"), t(2, "2026-04-20", "2026-07-03"), t(3, "2026-07-20", "2026-09-25"), t(4, "2026-10-12", "2026-12-17")],
    },
  ],
  TAS: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-02-05", "2026-04-17"), t(2, "2026-05-04", "2026-07-10"), t(3, "2026-07-27", "2026-10-02"), t(4, "2026-10-19", "2026-12-18")],
    },
  ],
  ACT: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-01-30", "2026-04-02"), t(2, "2026-04-21", "2026-07-03"), t(3, "2026-07-21", "2026-09-25"), t(4, "2026-10-13", "2026-12-18")],
    },
  ],
  NT: [
    {
      year: 2026, source: "aggregator", sourceUrl: CORAISE_2026,
      terms: [t(1, "2026-01-29", "2026-04-02"), t(2, "2026-04-14", "2026-06-19"), t(3, "2026-07-14", "2026-09-18"), t(4, "2026-10-06", "2026-12-10")],
    },
  ],
};

/** The timezone whose calendar date decides "which day was this" for each place. */
export const JURISDICTION_TIMEZONE: Record<Jurisdiction, string> = {
  NZ: "Pacific/Auckland",
  NSW: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  WA: "Australia/Perth",
  TAS: "Australia/Hobart",
  ACT: "Australia/Sydney",
  NT: "Australia/Darwin",
};

export const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
  NZ: "Aotearoa New Zealand", NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  SA: "South Australia", WA: "Western Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};

export function isJurisdiction(value: unknown): value is Jurisdiction {
  return typeof value === "string" && value in TERM_CALENDARS;
}

// ------------------------------------------------------------------ dates

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The local calendar date (YYYY-MM-DD) of an instant, in a jurisdiction. A story
 * saved at 9pm in Perth is a Perth date, not a UTC one. Returns null for
 * anything unparseable rather than inventing a day.
 */
export function localDate(instant: string | Date, jurisdiction: Jurisdiction): string | null {
  if (typeof instant === "string" && DATE_RE.test(instant)) return instant;
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JURISDICTION_TIMEZONE[jurisdiction],
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const y = get("year"), m = get("month"), d = get("day");
  return y && m && d ? `${y}-${m}-${d}` : null;
}

/** Day of week for a YYYY-MM-DD, 0 = Sunday. Pure calendar arithmetic, no timezone. */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ------------------------------------------------------------------ terms

export function termYear(jurisdiction: Jurisdiction, year: number): TermYear | null {
  return TERM_CALENDARS[jurisdiction]?.find((entry) => entry.year === year) ?? null;
}

export type TermHit = Term & { year: number };

/** The term a date falls in, or null if it is a holiday OR the year is unknown. */
export function termOn(isoDate: string, jurisdiction: Jurisdiction): TermHit | null {
  const year = Number(isoDate.slice(0, 4));
  const calendar = termYear(jurisdiction, year);
  if (!calendar) return null;
  const hit = calendar.terms.find((term) => isoDate >= term.start && isoDate <= term.end);
  return hit ? { ...hit, year } : null;
}

/**
 * true  = a school holiday
 * false = in term
 * null  = no calendar for that year, so nobody can say
 */
export function isSchoolHoliday(isoDate: string, jurisdiction: Jurisdiction): boolean | null {
  if (!termYear(jurisdiction, Number(isoDate.slice(0, 4)))) return null;
  return termOn(isoDate, jurisdiction) === null;
}

/** The term in progress, otherwise the next one that starts, otherwise null. */
export function currentOrNextTerm(isoDate: string, jurisdiction: Jurisdiction): TermHit | null {
  const current = termOn(isoDate, jurisdiction);
  if (current) return current;
  const year = Number(isoDate.slice(0, 4));
  for (const y of [year, year + 1]) {
    const calendar = termYear(jurisdiction, y);
    const next = calendar?.terms.find((term) => term.start > isoDate);
    if (next) return { ...next, year: y };
  }
  return null;
}

/**
 * The most recent term that has started on or before the date: the current
 * term, or the one that just ended during a holiday. "This term" for a report
 * written in the holidays means the term that just finished.
 */
export function latestStartedTerm(isoDate: string, jurisdiction: Jurisdiction): TermHit | null {
  const year = Number(isoDate.slice(0, 4));
  let best: TermHit | null = null;
  for (const y of [year - 1, year]) {
    for (const term of termYear(jurisdiction, y)?.terms ?? []) {
      if (term.start <= isoDate && (!best || term.start > best.start)) best = { ...term, year: y };
    }
  }
  return best;
}

/**
 * Weekdays after `fromDate` up to and including `toDate`. When the service
 * follows school terms, known school holiday days are not counted; days in a
 * year with no calendar ARE counted, so missing data can only make a signal
 * fire sooner.
 */
export function workingDaysBetween(
  fromDate: string,
  toDate: string,
  options: { jurisdiction: Jurisdiction; followsSchoolTerms: boolean },
): number {
  if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate) || toDate <= fromDate) return 0;
  let count = 0;
  let cursor = addDays(fromDate, 1);
  // Bounded: a date range longer than a few years is a bug, not a request.
  for (let guard = 0; cursor <= toDate && guard < 3660; guard++) {
    const dow = dayOfWeek(cursor);
    const weekend = dow === 0 || dow === 6;
    const holiday = options.followsSchoolTerms && isSchoolHoliday(cursor, options.jurisdiction) === true;
    if (!weekend && !holiday) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/**
 * Jurisdictions missing the current or the next calendar year, for the admin
 * system page. Next year is checked from September onwards, leaving a full
 * term's notice before schools resume in late January.
 */
export function termCoverageGaps(isoDate: string): Array<{ jurisdiction: Jurisdiction; year: number }> {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const years = month >= 9 ? [year, year + 1] : [year];
  const gaps: Array<{ jurisdiction: Jurisdiction; year: number }> = [];
  for (const jurisdiction of Object.keys(TERM_CALENDARS) as Jurisdiction[]) {
    for (const y of years) {
      if (!termYear(jurisdiction, y)) gaps.push({ jurisdiction, year: y });
    }
  }
  return gaps;
}
