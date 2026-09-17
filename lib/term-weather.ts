/**
 * Term weather: how a child's learning dispositions showed up across a term.
 *
 * Assessment without turning a child into data. It never scores, never ranks,
 * never compares one child with another. It reads the dispositions already
 * recorded on each saved story and describes, in plain sentences, which ones
 * kept appearing and when -- the way you would describe the weather over a
 * season, not grade it.
 *
 * NOTHING IS INVENTED. Every sentence is built only from what the stories
 * contain: which dispositions were recorded, on which dates. There is no model
 * call, so it costs nothing and cannot hallucinate. Contexts the stories do not
 * record in a structured way (outdoors or indoors, what happened before) are
 * deliberately not claimed.
 *
 * The disposition vocabulary is the one the story writer is already steered
 * towards (lib/ai/prompts.ts). Each recorded phrase is matched to that set by
 * plain keyword rules; a phrase that matches nothing is kept, as written, under
 * "also noticed" rather than forced into a category it may not belong to.
 */

export type Disposition =
  | "curiosity"
  | "perseverance"
  | "inventiveness"
  | "problem solving"
  | "confidence"
  | "resilience"
  | "working theories"
  | "communication"
  | "collaboration"
  | "independence"
  | "leadership"
  | "empathy"
  | "safe risk-taking"
  | "creativity";

/** Keyword stems, matched case-insensitively against each recorded phrase. */
const RULES: Array<[Disposition, RegExp]> = [
  ["curiosity", /curio|wonder|inquisitive/],
  ["perseverance", /persever|persist|determin|tenac|keep(s|ing)? (on )?trying|kept trying|stick(s|ing)? with/],
  ["inventiveness", /invent|ingenu/],
  ["problem solving", /problem[\s-]?solv/],
  ["confidence", /confiden/],
  ["resilience", /resilien|bounc(e|ed|ing) back/],
  ["working theories", /working theor|hypothes|theoris|theoriz/],
  ["communication", /communicat|expressi|express(es|ed|ing)? (their|his|her|ideas|feelings)/],
  ["collaboration", /collaborat|cooperat|co-operat|teamwork|working together|turn[\s-]?taking/],
  ["independence", /independen|autonom|self[\s-]?help|self[\s-]?reliance/],
  ["leadership", /leader|leading others/],
  ["empathy", /empath|compassion|kindness|caring for|manaaki/],
  ["safe risk-taking", /risk/],
  ["creativity", /creativ|imagin/],
];

export function matchDispositions(phrase: string): Disposition[] {
  const text = phrase.toLowerCase();
  return RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
}

export type WeatherStory = {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  dispositions: string[];
};

export type DispositionWeather = {
  disposition: Disposition;
  stories: number;
  firstDate: string;
  lastDate: string;
  /** How its appearances were spread across the term. */
  pattern: "steady" | "growing" | "earlier" | "once";
  sentence: string;
};

export type TermWeather = {
  childName: string;
  termLabel: string;
  termStart: string;
  termEnd: string;
  storiesInTerm: number;
  storiesWithDispositions: number;
  weather: DispositionWeather[];
  /** Recorded phrases that matched no known disposition, kept as written. */
  alsoNoticed: string[];
  summary: string;
};

function weeksBetween(a: string, b: string) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.max(1, Math.round(ms / (7 * 86_400_000)) + 1);
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildTermWeather(input: {
  childName: string;
  termLabel: string;
  termStart: string;
  termEnd: string;
  stories: WeatherStory[];
}): TermWeather {
  const { termStart, termEnd } = input;
  const inTerm = input.stories
    .filter((s) => typeof s.date === "string" && s.date >= termStart && s.date <= termEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  // The term's midpoint splits "earlier" from "later" appearances.
  const midpoint = new Date((Date.parse(`${termStart}T00:00:00Z`) + Date.parse(`${termEnd}T00:00:00Z`)) / 2)
    .toISOString()
    .slice(0, 10);

  const byDisposition = new Map<Disposition, string[]>();
  const unmatched = new Set<string>();
  let storiesWithDispositions = 0;

  for (const story of inTerm) {
    const phrases = (story.dispositions ?? []).filter((p) => typeof p === "string" && p.trim());
    if (phrases.length) storiesWithDispositions += 1;
    // A disposition counts once per story, however many phrases name it.
    const seenThisStory = new Set<Disposition>();
    for (const phrase of phrases) {
      const matches = matchDispositions(phrase);
      if (!matches.length) unmatched.add(phrase.trim());
      for (const match of matches) seenThisStory.add(match);
    }
    for (const disposition of seenThisStory) {
      const dates = byDisposition.get(disposition) ?? [];
      dates.push(story.date);
      byDisposition.set(disposition, dates);
    }
  }

  const weather: DispositionWeather[] = [...byDisposition.entries()].map(([disposition, dates]) => {
    const early = dates.filter((d) => d < midpoint).length;
    const late = dates.length - early;
    const pattern: DispositionWeather["pattern"] =
      dates.length === 1 ? "once" : late >= early * 2 && late >= 2 ? "growing" : early >= late * 2 && early >= 2 ? "earlier" : "steady";
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const name = capitalise(disposition);
    const count = plural(dates.length, "story", "stories");
    const sentence =
      pattern === "once"
        ? `${name} was recorded in one story this term.`
        : pattern === "growing"
          ? `${name} showed up in ${count}, more often later in the term.`
          : pattern === "earlier"
            ? `${name} showed up in ${count}, mostly earlier in the term.`
            : `${name} showed up in ${count} across ${plural(weeksBetween(firstDate, lastDate), "week", "weeks")}.`;
    return { disposition, stories: dates.length, firstDate, lastDate, pattern, sentence };
  });

  // Most frequently recorded first. This orders a child's OWN dispositions
  // against each other; it never compares children.
  weather.sort((a, b) => b.stories - a.stories || a.disposition.localeCompare(b.disposition));

  const summary =
    inTerm.length === 0
      ? `No stories about ${input.childName} were saved in ${input.termLabel}.`
      : storiesWithDispositions === 0
        ? `${plural(inTerm.length, "story", "stories")} about ${input.childName} in ${input.termLabel}, none with learning dispositions recorded.`
        : weather.length === 0
          ? `${plural(inTerm.length, "story", "stories")} about ${input.childName} in ${input.termLabel}. The dispositions recorded are listed below as written.`
          : `Across ${plural(inTerm.length, "story", "stories")} in ${input.termLabel}, ${weather[0].disposition} came up most often for ${input.childName}.`;

  return {
    childName: input.childName,
    termLabel: input.termLabel,
    termStart,
    termEnd,
    storiesInTerm: inTerm.length,
    storiesWithDispositions,
    weather,
    alsoNoticed: [...unmatched].sort((a, b) => a.localeCompare(b)),
    summary,
  };
}
