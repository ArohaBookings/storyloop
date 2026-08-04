/**
 * Calibrate the quality grader against stories we already have.
 *
 * A grader is only useful if it separates good writing from bad. This runs the
 * detectors over the 58 sweep stories (known good) and over the real defect
 * sentences pulled from production (known bad), and reports the spread.
 */
import { readFileSync } from "node:fs";
import {
  getMetaCommentaryIssues,
  getToneTells,
  getReadabilityFlags,
} from "../lib/ai/quality-guards";

const file = process.argv[2];
const stories: Array<{ id: string; story: string; words: number }> = JSON.parse(readFileSync(file, "utf8"));

let cleanCount = 0;
const flagged: Array<{ id: string; issues: string[] }> = [];

for (const s of stories) {
  const issues = [
    ...getMetaCommentaryIssues(s.story),
    ...getToneTells(s.story),
    ...getReadabilityFlags(s.story),
  ];
  if (issues.length === 0) cleanCount += 1;
  else flagged.push({ id: s.id, issues });
}

console.log(`GOOD CORPUS (${stories.length} generated stories)`);
console.log(`  clean: ${cleanCount}/${stories.length}`);
if (flagged.length) {
  console.log(`  flagged: ${flagged.length}`);
  for (const f of flagged.slice(0, 12)) console.log(`    ${f.id}: ${f.issues.join(" | ")}`);
}

// Known-bad corpus: real sentences that shipped to customers.
const BAD = [
  "The note says that Sam pushed Josh, and Josh got mad.",
  "Because the note is brief, we are careful not to add extra details.",
  "The note does not tell us how long Mia worked on the bridge.",
  "What we can say is that Tane's position shifted within one play session.",
  "This was a beautiful moment that demonstrated holistic development.",
  "Harry spent time exploring and was engaged in meaningful play, showcasing his remarkable curiosity.",
];
console.log(`\nKNOWN-BAD CORPUS (${BAD.length} real defect sentences)`);
let caught = 0;
for (const b of BAD) {
  const issues = [...getMetaCommentaryIssues(b), ...getToneTells(b)];
  if (issues.length > 0) caught += 1;
  console.log(`  ${issues.length > 0 ? "CAUGHT" : "MISSED"}: ${b.slice(0, 62)}`);
}
console.log(`  caught ${caught}/${BAD.length}`);

// Quote preservation across the corpus that had quotes.
const withQuotes = stories.filter((s) => /["“']/.test(s.story));
console.log(`\nQUOTE CHECK: ${withQuotes.length} stories contain quoted speech`);

process.exit(caught === BAD.length && cleanCount / stories.length >= 0.9 ? 0 : 1);
