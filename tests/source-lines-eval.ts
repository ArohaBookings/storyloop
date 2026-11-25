import { readFileSync } from "node:fs";
import path from "node:path";
import { matchSources, noteUnits, observationSentences, splitSentences, type SourceSentence } from "../lib/source-lines";

/**
 * The A4 gate's measurement (25 Nov 2026). Reads the invented fixtures, builds
 * each story or statement as the page would show it, runs the matcher and
 * scores it against the hand labels. Odd positions are the tune half, even
 * positions the held-out half.
 */

type Gold = { kind: "backed" | "unbacked" | "reading"; sources: number[] };
type StoryFixture = { id: string; child: string; framework: "nz" | "au"; joiner: string; note: string[]; title: string; paras: [string, string][][]; reading: string; next: string };
type StatementFixture = { id: string; child: string; framework: string; joiner: string; note: string[]; outcomes: { outcome: string; seen: [string, string][]; strategy: string }[] };

const DIR = path.join(process.cwd(), "tests/fixtures/source-lines");
export const STORIES: StoryFixture[] = JSON.parse(readFileSync(path.join(DIR, "stories.json"), "utf8")).stories;
export const STATEMENTS: StatementFixture[] = JSON.parse(readFileSync(path.join(DIR, "statements.json"), "utf8")).statements;

export function parseGold(raw: string): Gold {
  if (raw === "x") return { kind: "unbacked", sources: [] };
  if (raw === "r") return { kind: "reading", sources: [] };
  if (raw.startsWith("r:")) return { kind: "reading", sources: raw.slice(2).split(",").map(Number) };
  return { kind: "backed", sources: raw.split(",").map(Number) };
}

/** The story as StoryLoop lays it out: title, Learning Story, then the reading sections. */
export function storyText(story: StoryFixture) {
  const links = story.framework === "nz"
    ? ["Curriculum links", `Mana aotūroa | Exploration: ${story.child} was exploring and testing ideas.`]
    : ["EYLF links", `Outcome 4: ${story.child} is a confident and involved learner.`];
  return [
    story.title,
    `Learning Story\n${story.paras.map((p) => p.map((s) => s[0]).join(" ")).join("\n\n")}`,
    `What learning we noticed\n${story.reading}`,
    links.join("\n"),
    `Where to next / Responding\n${story.next}`,
  ].join("\n\n");
}

export type Case = { id: string; kind: "story" | "statement"; split: "tune" | "held"; note: string; units: string[]; pairs: { got: SourceSentence; gold: Gold }[] };

/** Every case, matched. Throws when the splitter does not reproduce a fixture's units or sentences, so a gold number can never point at the wrong line. */
export function runCases(): Case[] {
  const cases: Case[] = [];
  STORIES.forEach((story, index) => {
    const note = story.note.join(story.joiner);
    const result = matchSources({ note, text: storyText(story), kind: "story", childName: story.child });
    const gold = story.paras.flat();
    const got = observationSentences(result);
    if (JSON.stringify(result.units) !== JSON.stringify(story.note)) throw new Error(`${story.id}: note units differ: ${JSON.stringify(result.units)}`);
    if (got.length !== gold.length || got.some((s, i) => s.text !== gold[i][0])) throw new Error(`${story.id}: sentences differ: ${JSON.stringify(got.map((s) => s.text))}`);
    cases.push({ id: story.id, kind: "story", split: index % 2 === 0 ? "tune" : "held", note, units: result.units, pairs: got.map((s, i) => ({ got: s, gold: parseGold(gold[i][1]) })) });
  });
  STATEMENTS.forEach((statement, index) => {
    const note = statement.note.join(statement.joiner);
    if (JSON.stringify(noteUnits(note)) !== JSON.stringify(statement.note)) throw new Error(`${statement.id}: note units differ`);
    const pairs: Case["pairs"] = [];
    for (const outcome of statement.outcomes) {
      const seen = outcome.seen.map((s) => s[0]).join(" ");
      if (JSON.stringify(splitSentences(seen)) !== JSON.stringify(outcome.seen.map((s) => s[0]))) throw new Error(`${statement.id}: seen sentences differ`);
      const got = observationSentences(matchSources({ note, text: seen, kind: "statement", childName: statement.child }));
      got.forEach((s, i) => pairs.push({ got: s, gold: parseGold(outcome.seen[i][1]) }));
    }
    cases.push({ id: statement.id, kind: "statement", split: index % 2 === 0 ? "tune" : "held", note, units: noteUnits(note), pairs });
  });
  return cases;
}

/** Wilson score interval, 95%. */
export function wilson(k: number, n: number) {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = k / n;
  const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return [Math.max(0, +(centre - half).toFixed(3)), Math.min(1, +(centre + half).toFixed(3))];
}

export type Score = {
  cases: number; sentences: number;
  links: { right: number; drawn: number; precision: number; ci95: number[] };
  falseFlags: { flagged: number; backed: number; rate: number; ci95: number[] };
  catches: { caught: number; unbacked: number; rate: number; ci95: number[] };
  backedMissedLink: number;
  readingFlagged: number;
};

/**
 * Link precision: of the note lines the matcher names, how many are in the
 * gold sources (any line named on a sentence the gold says the note does not
 * back is wrong). False flags: gold-backed sentences marked "not in your
 * note". Catches: gold-unbacked sentences marked "not in your note".
 */
export function score(cases: Case[]): Score {
  let right = 0, drawn = 0, backed = 0, flagged = 0, unbacked = 0, caught = 0, sentences = 0, backedMissedLink = 0, readingFlagged = 0;
  for (const c of cases) {
    for (const { got, gold } of c.pairs) {
      sentences += 1;
      for (const source of got.sources) {
        drawn += 1;
        if (gold.sources.includes(source)) right += 1;
      }
      if (gold.kind === "backed") {
        backed += 1;
        if (got.status === "unbacked") flagged += 1;
        if (got.status !== "backed") backedMissedLink += 1;
      }
      if (gold.kind === "unbacked") {
        unbacked += 1;
        if (got.status === "unbacked") caught += 1;
      }
      if (gold.kind === "reading" && got.status === "unbacked") readingFlagged += 1;
    }
  }
  const r = (a: number, b: number) => (b ? +(a / b).toFixed(3) : 0);
  return {
    cases: cases.length, sentences,
    links: { right, drawn, precision: r(right, drawn), ci95: wilson(right, drawn) },
    falseFlags: { flagged, backed, rate: r(flagged, backed), ci95: wilson(flagged, backed) },
    catches: { caught, unbacked, rate: r(caught, unbacked), ci95: wilson(caught, unbacked) },
    backedMissedLink, readingFlagged,
  };
}

export const GATE = { precision: 0.9, falseFlags: 0.1 };

export function passes(s: Score) {
  return s.links.precision >= GATE.precision && s.falseFlags.rate <= GATE.falseFlags;
}

/** The tune half's misses, for tuning. Never called on the held-out half while tuning. */
export function misses(cases: Case[]) {
  const out: string[] = [];
  for (const c of cases) {
    for (const { got, gold } of c.pairs) {
      const wrongLink = got.sources.some((s) => !gold.sources.includes(s));
      const flaggedBacked = gold.kind === "backed" && got.status === "unbacked";
      const missedCatch = gold.kind === "unbacked" && got.status !== "unbacked";
      if (wrongLink || flaggedBacked || missedCatch) out.push(`${c.id} [${gold.kind} ${gold.sources}] got ${got.status} ${got.sources}: ${got.text}`);
    }
  }
  return out;
}
