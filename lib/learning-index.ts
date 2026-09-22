/**
 * The Early Learning Index.
 *
 * Ministries hold enrolment and funding data. ERO and ACECQA hold ratings.
 * Nobody holds the moments. There has never been a real-time picture of what
 * young children are actually doing, because the only people who see it write
 * it down in twenty thousand separate accounts.
 *
 * This is the machinery for producing one: what tamariki were exploring this
 * term, by age band and region, aggregated across services that chose to
 * contribute. It is the one thing in StoryLoop that could not be copied by a
 * competitor with more money, because it cannot be bought, only accumulated.
 *
 * IT IS DELIBERATELY BUILT BEFORE IT IS USEFUL. Consent cannot be retrofitted:
 * asking twenty thousand accounts afterwards whether last year's documentation
 * may be counted is a question with only one honest answer, which is no. So the
 * architecture exists now, opt-in and off by default, and the publication gate
 * below refuses to produce anything until there is enough data for "anonymous"
 * to be true rather than aspirational.
 *
 * WHAT LEAVES A SERVICE: counts. A tally of how often a theme appeared, in
 * which age band, in which region, in which quarter. No child, no educator, no
 * service, no free text, no story, no date more precise than a quarter.
 *
 * THE SUPPRESSION RULES BELOW ARE THE PRODUCT. Everything else is arithmetic.
 * An index that let a determined reader work out that one rural service had
 * three children interested in eels would be worse than no index, because the
 * families who trusted us are the ones who would pay for it.
 */

export type IndexAgeBand = "under-2" | "2-3" | "3-5";
export type IndexRegion = string;

/** One service's contribution for one quarter. Counts only. */
export type ServiceContribution = {
  /** Opaque per-service id. Used for counting distinct services and never published. */
  serviceId: string;
  region: IndexRegion;
  quarter: string;
  /** theme -> how many times it appeared, by age band. */
  themes: Array<{ theme: string; ageBand: IndexAgeBand; count: number }>;
};

export type IndexCell = {
  theme: string;
  ageBand: IndexAgeBand;
  region: IndexRegion;
  observations: number;
  /** How many DIFFERENT services contributed to this cell. */
  services: number;
  /** Share of observations in this age band and region, 0-1, rounded. */
  share: number;
};

export type IndexPublication =
  | { publishable: false; reasons: string[]; quarter: string; contributingServices: number }
  | {
      publishable: true;
      quarter: string;
      contributingServices: number;
      cells: IndexCell[];
      suppressed: number;
      notes: string[];
    };

/**
 * Nothing is published until this many services have opted in for the quarter.
 * Below it, "aggregated across services" describes a handful of rooms, and any
 * reader who knows the sector could name them.
 */
export const MIN_CONTRIBUTING_SERVICES = 8;

/**
 * A cell must be built from at least this many separate services, and this
 * many observations, or it is suppressed. Both, not either: fifty
 * observations from one service is one service's programme, not a signal, and
 * publishing it tells everyone what that service has been doing.
 */
export const MIN_SERVICES_PER_CELL = 3;
export const MIN_OBSERVATIONS_PER_CELL = 12;

/** Below this, a region is too small to name without pointing at somebody. */
export const MIN_SERVICES_PER_REGION = 3;

const clean = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Turn contributions into a publication, or refuse and say why.
 *
 * The refusal path is the important one. It is used far more often than the
 * other, it must be readable by whoever is deciding whether to publish, and it
 * must never be overridable by a flag, because the flag would be used.
 */
export function buildIndex(input: {
  quarter: string;
  contributions: ServiceContribution[];
}): IndexPublication {
  const forQuarter = input.contributions.filter((c) => c.quarter === input.quarter);
  const services = new Set(forQuarter.map((c) => c.serviceId));

  const reasons: string[] = [];
  if (services.size < MIN_CONTRIBUTING_SERVICES) {
    reasons.push(
      `Only ${services.size} ${services.size === 1 ? "service has" : "services have"} contributed for ${input.quarter}. ` +
        `At least ${MIN_CONTRIBUTING_SERVICES} are needed before anything is published.`,
    );
  }
  if (reasons.length) {
    return { publishable: false, reasons, quarter: input.quarter, contributingServices: services.size };
  }

  // Tally: theme + age band + region, tracking WHICH services, not just how many.
  type Tally = { observations: number; services: Set<string> };
  const cells = new Map<string, Tally>();
  const bandTotals = new Map<string, number>();
  const regionServices = new Map<string, Set<string>>();

  for (const contribution of forQuarter) {
    const region = clean(contribution.region) || "unknown";
    regionServices.set(region, (regionServices.get(region) ?? new Set()).add(contribution.serviceId));

    for (const entry of contribution.themes) {
      const theme = clean(entry.theme);
      if (!theme || entry.count <= 0) continue;
      const key = `${theme}|${entry.ageBand}|${region}`;
      const tally = cells.get(key) ?? { observations: 0, services: new Set<string>() };
      tally.observations += entry.count;
      tally.services.add(contribution.serviceId);
      cells.set(key, tally);

      const bandKey = `${entry.ageBand}|${region}`;
      bandTotals.set(bandKey, (bandTotals.get(bandKey) ?? 0) + entry.count);
    }
  }

  let suppressed = 0;
  const published: IndexCell[] = [];

  for (const [key, tally] of cells) {
    const [theme, ageBand, region] = key.split("|") as [string, IndexAgeBand, string];

    // Every suppression rule, applied without exception.
    if ((regionServices.get(region)?.size ?? 0) < MIN_SERVICES_PER_REGION) { suppressed += 1; continue; }
    if (tally.services.size < MIN_SERVICES_PER_CELL) { suppressed += 1; continue; }
    if (tally.observations < MIN_OBSERVATIONS_PER_CELL) { suppressed += 1; continue; }

    const total = bandTotals.get(`${ageBand}|${region}`) ?? 0;
    published.push({
      theme,
      ageBand,
      region,
      observations: tally.observations,
      services: tally.services.size,
      share: total > 0 ? Math.round((tally.observations / total) * 1000) / 1000 : 0,
    });
  }

  published.sort((a, b) => b.observations - a.observations || a.theme.localeCompare(b.theme));

  const notes = [
    `Counted from ${services.size} services that chose to contribute.`,
    `Cells seen in fewer than ${MIN_SERVICES_PER_CELL} services or with fewer than ${MIN_OBSERVATIONS_PER_CELL} observations are not shown.`,
    "No child, educator, service or story appears in this data, and no date finer than a quarter.",
  ];
  if (suppressed) notes.push(`${suppressed} ${suppressed === 1 ? "cell was" : "cells were"} suppressed as too thin to publish safely.`);

  return { publishable: true, quarter: input.quarter, contributingServices: services.size, cells: published, suppressed, notes };
}

/**
 * The themes a service would contribute, derived from what it already records.
 *
 * Only vocabulary the product itself defines is counted: curriculum links and
 * dispositions, which are chosen from known sets. Free text is never counted,
 * because free text carries names, and a theme list built from what educators
 * typed would eventually contain a child.
 */
export function contributionFromRecords(input: {
  serviceId: string;
  region: string;
  quarter: string;
  records: Array<{ ageBand: IndexAgeBand; outcomes: string[]; dispositions: string[] }>;
}): ServiceContribution {
  const counts = new Map<string, number>();
  for (const record of input.records) {
    // Once per record per theme: a story that says "exploration" four times is
    // one observation of exploration, not four.
    for (const theme of new Set([...record.outcomes, ...record.dispositions].map(clean).filter(Boolean))) {
      const key = `${theme}|${record.ageBand}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return {
    serviceId: input.serviceId,
    region: input.region,
    quarter: input.quarter,
    themes: [...counts.entries()].map(([key, count]) => {
      const [theme, ageBand] = key.split("|") as [string, IndexAgeBand];
      return { theme, ageBand, count };
    }),
  };
}

/** Which quarter a date falls in, as a stable label. */
export function quarterOf(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

/**
 * Map a service's own age-group wording onto the three bands the index uses.
 *
 * Educators type this freely ("3-4 years", "toddlers", "over 2s"), so the
 * mapping is forgiving and, where it cannot tell, returns null rather than
 * guessing. A record placed in the wrong band is a wrong number published
 * nationally, which is worse than a record left out.
 */
export function ageBandFrom(ageGroup: string | null | undefined): IndexAgeBand | null {
  const text = (ageGroup ?? "").toLowerCase();
  if (!text.trim()) return null;
  if (/\bunder\s*2|\b0\s*-\s*2|\binfant|\bbaby|\bbabies|\bnursery\b/.test(text)) return "under-2";
  if (/\b2\s*-\s*3|\btoddler/.test(text)) return "2-3";
  if (/\b3\s*-\s*[45]|\b4\s*-\s*5|\bpre-?school|\bkinder/.test(text)) return "3-5";
  // A bare number is readable, anything else is not.
  const first = text.match(/\b(\d)\b/);
  if (first) {
    const age = Number(first[1]);
    if (age < 2) return "under-2";
    if (age < 3) return "2-3";
    if (age <= 5) return "3-5";
  }
  return null;
}
