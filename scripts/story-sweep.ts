/**
 * Story quality sweep. Generates stories across every observation type we can
 * receive and asserts the qualities that make output shareable:
 *   - never writes about the note (the defect that shipped to 23% of stories)
 *   - no em dashes
 *   - preserves the child's exact words, misspellings included
 *   - no educator-facing QA language in the story body
 *
 * Usage: npx tsx scripts/story-sweep.ts [caseIdFilter]
 */
// Load .env.local the way Next does, so the sweep exercises the real model
// rather than silently falling back to the deterministic builder.
import { readFileSync as readEnvFile } from "node:fs";
for (const line of readEnvFile(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { generateLearningStory } from "../lib/ai/generate";
import { getMetaCommentaryIssues } from "../lib/ai/quality-guards";
import type { StoryDepth, StoryFrameworkId, StoryTone } from "../lib/story-options";

type Case = {
  id: string;
  note: string;
  child?: string;
  age?: string;
  framework: StoryFrameworkId;
  depth?: StoryDepth;
  tone?: StoryTone;
  /** exact substrings that must survive verbatim into the story */
  mustKeep?: string[];
};

const CASES: Case[] = [
  // thin notes: the class that produced the Josh defect
  { id: "thin-push", note: "josh played with sam on the playground, sam pushed of josh, josh got mad", child: "Josh", age: "3-4 years", framework: "NZ" },
  { id: "thin-swing", note: "harry played on the swing", child: "Harry", age: "2-3 years", framework: "NZ" },
  { id: "thin-playdough", note: "billy playdough", child: "Billy", age: "2-3 years", framework: "NZ" },
  { id: "thin-sand", note: "aria sandpit bucket again and again", child: "Aria", age: "2-3 years", framework: "NZ" },
  { id: "thin-paint", note: "mia painted", child: "Mia", age: "3-4 years", framework: "AU" },
  { id: "thin-dropoff", note: "leo cried at drop off, settled after a while", child: "Leo", age: "1-2 years", framework: "NZ" },
  { id: "thin-climb", note: "tama climbed the fort by himself first time", child: "Tama", age: "3-4 years", framework: "NZ" },
  { id: "thin-share", note: "ella gave the truck to noah", child: "Ella", age: "2-3 years", framework: "AU" },
  { id: "edge-single-word", note: "blocks", child: "Ari", age: "3-4 years", framework: "NZ" },

  // safety / physical conflict
  { id: "safety-bite", note: "During morning tea Ruby bit Ana on the arm. Ana cried. I checked her arm, there was a mark but no broken skin. I stayed with both children.", child: "Ruby", age: "2-3 years", framework: "NZ" },
  { id: "safety-push", note: "During the outdoor transition, Luca pushed Ava near the gate. Ava fell onto a rubber mat and cried. I moved between them, checked Ava for injury, and helped Luca step aside and name what happened.", child: "Luca", age: "3-4 years", framework: "NZ" },
  { id: "safety-hit", note: "Sione hit another child with a block when they took his tower piece. No injury. We talked about safe hands.", child: "Sione", age: "3-4 years", framework: "AU" },
  { id: "safety-abit-falsepos", note: "Nikau was a bit unsure at mat time but joined in after a bit of encouragement", child: "Nikau", age: "3-4 years", framework: "NZ" },

  // rich notes
  { id: "rich-bridge", note: "During afternoon block play, Luca placed two long planks across four blocks to make a bridge. The left side wobbled when he rolled a wooden truck over it. He paused, moved one support closer to the middle and tested the truck again. He smiled and said, \"It stays now.\" He invited Ava to roll her truck across, waited, then changed the ramp angle after her truck stopped.", child: "Luca", age: "4-5 years", framework: "NZ", mustKeep: ["It stays now"] },
  { id: "rich-water", note: "During outdoor water play, Ari placed two planks over a shallow channel and poured water from a metal jug. When the first stream ran around the side, Ari moved one plank, pressed wet sand against the gap, and watched closely. Ari called to Noor, 'Pour it now, I made a gate.' They took turns filling the jug and rebuilt the edge after it collapsed.", child: "Ari", age: "4-5 years", framework: "NZ" },
  { id: "rich-stones", note: "Luca sorted smooth stones into small, medium, and large groups. He counted each group, noticed two groups had the same number, and moved one stone to test how the totals changed. He told Ava, \"Now this side has more.\"", child: "Luca", age: "4-5 years", framework: "AU", mustKeep: ["Now this side has more"] },

  // verbatim child voice, misspellings must survive
  { id: "quote-watta", note: "Kahu was pouring at the water table and said \"its to much watta\" when it spilled over the edge. He tipped some back out and tried again.", child: "Kahu", age: "3-4 years", framework: "NZ", mustKeep: ["its to much watta"] },
  { id: "quote-medoit", note: "Amaia held up the toy and said \"me do it me do it\" then pushed my hand away and did the buckle herself", child: "Amaia", age: "2-3 years", framework: "NZ", mustKeep: ["me do it"] },
  { id: "quote-dragon", note: "Noah built with damp sand and said \"I'm making a castle for the dragon\". When one side collapsed he packed more sand around the base and tried again.", child: "Noah", age: "3-4 years", framework: "AU", mustKeep: ["castle for the dragon"] },

  // embedded educator instructions
  { id: "instr-firstperson-tereo", note: "6 july. james cant get nail in wood. \"would you like some help James?\" You nod and say \"Help me please.\" Just needed more pressure, held the nail in a perfect pincer grip. Smiled when he banged it in. Can you please write this in the first person? Add a te reo phrase.", child: "James", age: "2-3 years", framework: "NZ", mustKeep: ["Help me please"] },
  { id: "instr-runningrecord", note: "Tiana stirs the pot, puts fruit in the sink, opens the oven and finds a plate. \"I got pate.!\" she says. Make a running record observation. Present tense", child: "Tiana", age: "2-3 years", framework: "AU" },
  { id: "instr-tereo", note: "Mere counted the pebbles to ten and started again. add a te reo affirmation", child: "Mere", age: "3-4 years", framework: "NZ" },

  // group / multi-child
  { id: "group-space", note: "Our tamariki have become fascinated by space, the Moon and the wider universe. We built rockets, experimented with light and shadows, created planets and constellations. We are weaving te ao Maori through purakau.", child: "Group", age: "Mixed group", framework: "NZ" },
  { id: "group-garden", note: "The preschool group planted seedlings in the vegetable patch. Some children watered, others dug. Ava counted the rows out loud.", child: "Group", age: "Mixed group", framework: "AU" },

  // messy input
  { id: "messy-caps", note: "OK SO TODAY MAIA WAS AT THE COLLAGE TABLE SHE CUT AROUND A PICTURE OF A DOG REALLY CAREFULLY THEN GLUED IT ON AND DREW LEGS ON IT", child: "Maia", age: "4-5 years", framework: "NZ" },
  { id: "messy-typos", note: "keiller 15 mnths buiding towr stacks as hi as he can reeach busts twoer down rebuils again balancin carful", child: "Keiller", age: "1-2 years", framework: "NZ" },
  { id: "messy-bullets", note: "- sat with book\n- turned pages\n- pointed at dog\n- said dog\n- looked at me", child: "Sam", age: "1-2 years", framework: "AU" },
  { id: "messy-runon", note: "so we were outside and then she went to the sandpit and then she got the spade and then she dug a hole and then she put water in it and then it went away and she looked confused and then she did it again", child: "Ruby", age: "3-4 years", framework: "NZ" },

  // infant / age edges
  { id: "infant-rattle", note: "Nikau (7 months) reached for the wooden rattle, held it, brought it to his mouth, then dropped it and looked at where it fell.", child: "Nikau", age: "0-12 months", framework: "NZ" },
  { id: "infant-agemismatch", note: "josh played with sam on the playground, sam pushed of josh, josh got mad", child: "Josh", age: "0-12 months", framework: "NZ" },

  // cultural / identity
  { id: "cultural-matariki", note: "At our centre Matariki disco night Alani was dancing while we were having kai, sat with mum and dad, greeting her teachers Jackie Aimee and Georgia coming over for a cuddle, continued dancing to the music.", child: "Alani", age: "1-2 years", framework: "NZ" },
  { id: "cultural-samoan", note: "Sefina counted to five in Samoan with her nana at pickup and then showed me on her fingers.", child: "Sefina", age: "3-4 years", framework: "NZ" },

  // emotional / relational
  { id: "emo-cuddle", note: "Ds was a little sad at times today and would ask for a cuddle. She settled when we sat together and looked at the window.", child: "Ds", age: "2-3 years", framework: "NZ" },
  { id: "emo-friendship", note: "Shae and Ella greeted each other at the gate, held hands and chose to sit together at kai.", child: "Shae", age: "3-4 years", framework: "NZ" },

  // literacy / numeracy
  { id: "lit-name", note: "Sylvie looked for the letters that make up her name on the magnet board and found the S and the E.", child: "Sylvie", age: "4-5 years", framework: "NZ" },
  { id: "num-fish", note: "Evan played the fishing number game, caught each fish, recognised the number and shared it with his peers.", child: "Evan", age: "4-5 years", framework: "AU" },

  // missing fields
  { id: "edge-no-name", note: "the child stacked cups and knocked them over, then did it again", age: "1-2 years", framework: "AU" },
  { id: "edge-no-age", note: "Tane didn't want to share the blocks at first. Later in the same session he gave some to Leo.", child: "Tane", framework: "NZ" },
];

// Depth/tone variants push the sweep past 50 real generations.
const VARIANTS: Array<{ depth: StoryDepth; tone: StoryTone }> = [
  { depth: "concise", tone: "simple" },
  { depth: "detailed", tone: "professional" },
];
const VARIANT_IDS = new Set([
  "thin-push", "thin-swing", "safety-bite", "safety-push", "rich-bridge",
  "quote-watta", "instr-firstperson-tereo", "group-space", "infant-rattle", "messy-typos",
]);

type Finding = { id: string; kind: string; detail: string };

function check(id: string, story: string, c: Case): Finding[] {
  const out: Finding[] = [];
  for (const issue of getMetaCommentaryIssues(story)) {
    out.push({ id, kind: "META", detail: issue });
  }
  if (story.includes("—")) out.push({ id, kind: "EMDASH", detail: "story contains an em dash" });
  for (const keep of c.mustKeep ?? []) {
    if (!story.toLowerCase().includes(keep.toLowerCase())) {
      out.push({ id, kind: "QUOTE-LOST", detail: `verbatim wording missing: "${keep}"` });
    }
  }
  if (/\bas an ai\b|language model/i.test(story)) out.push({ id, kind: "AI-LEAK", detail: "AI self-reference" });
  return out;
}

async function main() {
  const filter = process.argv[2];
  const runs: Array<{ c: Case; depth?: StoryDepth; tone?: StoryTone }> = [];
  for (const c of CASES) {
    if (filter && !c.id.includes(filter)) continue;
    runs.push({ c });
    if (VARIANT_IDS.has(c.id)) for (const v of VARIANTS) runs.push({ c, ...v });
  }

  console.log(`Running ${runs.length} generations...\n`);
  const findings: Finding[] = [];
  const results: Array<{ id: string; words: number; title: string; story: string }> = [];
  let n = 0;

  for (const run of runs) {
    n += 1;
    const label = run.depth ? `${run.c.id}[${run.depth}]` : run.c.id;
    try {
      const r = await generateLearningStory({
        observations: run.c.note,
        childName: run.c.child || undefined,
        ageGroup: run.c.age || undefined,
        framework: run.c.framework,
        depth: run.depth,
        tone: run.tone,
      });
      const f = check(label, r.story, run.c);
      findings.push(...f);
      results.push({ id: label, words: r.wordCount ?? r.story.split(/\s+/).length, title: r.storyTitle, story: r.story });
      const status = f.length === 0 ? "PASS" : `FAIL(${f.map((x) => x.kind).join(",")})`;
      console.log(`[${String(n).padStart(3)}/${runs.length}] ${status.padEnd(22)} ${label}`);
      for (const x of f) console.log(`        ${x.kind}: ${x.detail}`);
    } catch (err) {
      findings.push({ id: label, kind: "ERROR", detail: String(err) });
      console.log(`[${String(n).padStart(3)}/${runs.length}] ERROR                  ${label}: ${err}`);
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`TOTAL: ${runs.length} generations, ${findings.length} findings`);
  const byKind = new Map<string, number>();
  for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
  for (const [k, v] of byKind) console.log(`  ${k}: ${v}`);
  if (findings.length === 0) console.log("  CLEAN — every generation passed every check.");

  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.SWEEP_OUT || "/tmp/sweep-results.json", JSON.stringify(results, null, 2));
  console.log(`\nStories written to ${process.env.SWEEP_OUT || "/tmp/sweep-results.json"}`);
  process.exit(findings.length === 0 ? 0 : 1);
}

void main();
