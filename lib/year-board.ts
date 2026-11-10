/**
 * The year in one tap (10 Nov 2026): every child in the room on one page at the
 * end of the year. Who has stories and who does not, what each child's stories
 * were about, what they were working on last, and the three jobs the end of
 * year asks of an educator, each one tap away: the child's summary or
 * transition statement, the family's keepsake file, and a handover sheet for
 * whoever has the room next year.
 *
 * Everything here is counted from stories the educator already saved. Nothing
 * is written by AI on this page and nothing is invented: a child with no
 * stories shows as a child with no stories.
 */
export const YEAR_THIN_STORIES = 3;

export type YearChild = { id: string; name: string; age_group: string | null; interests: string[] | null; home_languages: string[] | null };
export type YearStory = { child_id: string | null; child_name: string | null; created_at: string | null; outcomes: string[] | null; next_steps: string[] | null };

export type YearRow = {
  id: string | null;
  name: string;
  ageGroup: string;
  interests: string[];
  homeLanguages: string[];
  stories: number;
  firstStory: string | null;
  lastStory: string | null;
  /** What this child's stories were linked to most often, most frequent first. */
  topLinks: string[];
  /** The newest "where to next" the educator saved for this child. */
  workingOn: string;
  thin: boolean;
};

/** The calendar year an educator in New Zealand or Australia is in right now. */
export function teachingYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", year: "numeric" }).format(now));
}

/** 1 January of that year in New Zealand, as an instant: the earliest any NZ or AU educator's year starts. */
export function yearStart(year: number) {
  return new Date(`${year}-01-01T00:00:00+13:00`);
}

function shortLink(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 60);
}

function firstName(value: string | null | undefined) {
  return (value ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * One row per child, thinnest first, so the children who need a story before
 * the year ends are at the top. Stories saved without a child profile are
 * grouped by the first name on the story and listed after the profiled children.
 */
export function buildYearBoard(children: YearChild[], stories: YearStory[], now = new Date()) {
  const year = teachingYear(now);
  const from = yearStart(year).getTime();
  const inYear = stories.filter((s) => s.created_at && new Date(s.created_at).getTime() >= from);

  const byChild = new Map<string, YearStory[]>();
  const loose = new Map<string, YearStory[]>();
  const known = new Set(children.map((c) => c.id));
  // A story saved without a profile still belongs to a child on the list when
  // exactly one child has that first name. Two Rubys: it stays apart, unguessed.
  const idsByFirstName = new Map<string, string[]>();
  for (const child of children) {
    const key = firstName(child.name).toLowerCase();
    if (key) idsByFirstName.set(key, [...(idsByFirstName.get(key) ?? []), child.id]);
  }
  for (const story of inYear) {
    const name = firstName(story.child_name);
    const sameName = idsByFirstName.get(name.toLowerCase()) ?? [];
    const childId = story.child_id && known.has(story.child_id) ? story.child_id : sameName.length === 1 ? sameName[0] : null;
    if (childId) {
      byChild.set(childId, [...(byChild.get(childId) ?? []), story]);
    } else {
      if (!name) continue;
      const key = name.toLowerCase();
      loose.set(key, [...(loose.get(key) ?? []), story]);
    }
  }

  const rowFor = (base: { id: string | null; name: string; ageGroup: string; interests: string[]; homeLanguages: string[] }, list: YearStory[]): YearRow => {
    const sorted = [...list].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
    const counts = new Map<string, number>();
    for (const story of sorted) for (const link of story.outcomes ?? []) {
      const key = shortLink(link);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const newestWithStep = [...sorted].reverse().find((s) => (s.next_steps ?? []).some((step) => step.trim()));
    return {
      ...base,
      stories: sorted.length,
      firstStory: sorted[0]?.created_at ?? null,
      lastStory: sorted[sorted.length - 1]?.created_at ?? null,
      topLinks: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([link]) => link),
      workingOn: (newestWithStep?.next_steps ?? []).find((step) => step.trim())?.trim().slice(0, 220) ?? "",
      thin: sorted.length < YEAR_THIN_STORIES,
    };
  };

  const profiled = children.map((child) =>
    rowFor({ id: child.id, name: child.name, ageGroup: child.age_group ?? "", interests: (child.interests ?? []).slice(0, 4), homeLanguages: (child.home_languages ?? []).slice(0, 3) }, byChild.get(child.id) ?? []),
  );
  const unlinked = [...loose.entries()].map(([, list]) =>
    rowFor({ id: null, name: firstName(list[0].child_name), ageGroup: "", interests: [], homeLanguages: [] }, list),
  );

  const order = (a: YearRow, b: YearRow) => a.stories - b.stories || a.name.localeCompare(b.name);
  const rows = [...profiled.sort(order), ...unlinked.sort(order)];
  return {
    year,
    rows,
    children: profiled.length,
    stories: inYear.length,
    thin: profiled.filter((row) => row.thin).length,
    ready: profiled.filter((row) => !row.thin).length,
    unlinkedStories: unlinked.reduce((sum, row) => sum + row.stories, 0),
  };
}

export type YearBoard = ReturnType<typeof buildYearBoard>;
