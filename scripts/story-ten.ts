/**
 * Ten fresh observations, none of them used in the earlier sweep, generated and
 * graded end to end. Prints the full story plus the measured grade so the
 * output can be judged on its own terms rather than on a pass/fail flag.
 */
import { readFileSync as readEnv } from "node:fs";
for (const line of readEnv(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { generateLearningStory } from "../lib/ai/generate";
import type { StoryFrameworkId, StoryDepth, StoryTone } from "../lib/story-options";

type Case = {
  n: number;
  what: string;
  note: string;
  child?: string;
  age?: string;
  framework: StoryFrameworkId;
  depth?: StoryDepth;
  tone?: StoryTone;
  keep?: string[];
};

const CASES: Case[] = [
  { n: 1, what: "Thin note, three words", note: "ruby did puzzles", child: "Ruby", age: "2-3 years", framework: "NZ" },
  { n: 2, what: "Verbatim toddler speech, misspelled on purpose", note: 'Manaia held the worm and said "he tikkles my hand" then put it back in the garden bed very gently', child: "Manaia", age: "3-4 years", framework: "NZ", keep: ["he tikkles my hand"] },
  { n: 3, what: "Safety incident, biting", note: "At kai time Ari bit Tama on the shoulder when Tama took his cup. Tama cried. No broken skin. I stayed with both and told both families.", child: "Ari", age: "1-2 years", framework: "NZ" },
  { n: 4, what: "Rich problem-solving, EYLF", note: "Hazel wanted the marble to reach the bottom of the ramp. It kept stopping at the join. She lifted the top piece higher with a block, tested it, and it still stopped. She swapped the flat piece for a curved one and the marble ran through. She said to Ivy, \"Now watch.\"", child: "Hazel", age: "4-5 years", framework: "AU", keep: ["Now watch"] },
  { n: 5, what: "Emotional / settling, infant", note: "Te Ao (9 months) cried when her mum left. I held her by the window and we watched the trucks. After a few minutes she stopped crying and pointed at a digger.", child: "Te Ao", age: "0-12 months", framework: "NZ" },
  { n: 6, what: "Voice-memo run-on, no punctuation", note: "so today at mat time jonah actually joined in for the whole song he usually walks off after about ten seconds but today he stayed and did the actions and looked at me the whole way through and then he did it again when we sang it a second time", child: "Jonah", age: "2-3 years", framework: "AU" },
  { n: 7, what: "Embedded instruction: first person + te reo", note: "Awhina helped tidy the blocks without being asked, then helped a younger child carry the basket. write this addressed to her and add a te reo affirmation", child: "Awhina", age: "4-5 years", framework: "NZ" },
  { n: 8, what: "Group observation, mixed ages", note: "The whole room got interested in the puddle after the rain. Some children stamped in it, two lay planks across it, one filled a bucket and poured it back in. We talked about where the water goes.", child: "Group", age: "Mixed group", framework: "NZ" },
  { n: 9, what: "Typo-heavy note, concise depth", note: "leni 18mnths pushd the trolly arund the yard bumpd the fence turnd it and kept going didnt give up", child: "Leni", age: "1-2 years", framework: "AU", depth: "concise", tone: "simple" },
  { n: 10, what: "Detailed depth, peer negotiation", note: "Sione and Mila both wanted the red cape. Sione held it first. Mila asked for a turn and Sione said no. Mila waited near him. After a while Sione took it off and gave it to her, then asked for it back when she was finished. They worked out a swap without an adult.", child: "Sione", age: "4-5 years", framework: "NZ", depth: "detailed", tone: "professional" },
];

const BAD = [
  /\b(?:the|this|your) notes? (?:says?|tells?|suggests?|describes?|is brief|does\s*n[o']t|also names)\b/i,
  /because the note/i,
  /what we can say is/i,
  /we are careful not to/i,
  /before .{0,14}shar(?:ed|ing)\b/i,
  /—/,
];

async function main() {
  let allClean = true;
  for (const c of CASES) {
    const r = await generateLearningStory({
      observations: c.note,
      childName: c.child,
      ageGroup: c.age,
      framework: c.framework,
      depth: c.depth,
      tone: c.tone,
    });

    const q = r.storyQuality;
    const defects = BAD.filter((re) => re.test(r.story)).map((re) => re.source);
    const lostQuotes = (c.keep ?? []).filter((k) => !r.story.toLowerCase().includes(k.toLowerCase()));
    const failedChecks = Object.entries(q?.checks ?? {}).filter(([, v]) => !v).map(([k]) => k);
    const ok = defects.length === 0 && lostQuotes.length === 0;
    if (!ok) allClean = false;

    console.log("\n" + "=".repeat(74));
    console.log(`TEST ${c.n}: ${c.what}`);
    console.log(`NOTE IN: ${c.note.slice(0, 150)}${c.note.length > 150 ? "…" : ""}`);
    console.log(`GRADE: ${q?.score}/100 | passes=${q?.passes} | words=${r.wordCount}` +
      (failedChecks.length ? ` | failed checks: ${failedChecks.join(", ")}` : " | all checks pass"));
    if (q?.issues?.length) console.log(`ISSUES: ${q.issues.join(" | ")}`);
    if (defects.length) console.log(`*** DEFECTS: ${defects.join(", ")}`);
    if (lostQuotes.length) console.log(`*** LOST VERBATIM: ${lostQuotes.join(", ")}`);
    if (c.keep && lostQuotes.length === 0) console.log(`VERBATIM KEPT: ${c.keep.map((k) => `"${k}"`).join(", ")}`);
    console.log("-".repeat(74));
    console.log(r.story);
  }
  console.log("\n" + "=".repeat(74));
  console.log(allClean ? "ALL 10 CLEAN" : "SOME FAILED");
  process.exit(allClean ? 0 : 1);
}

void main();
