/**
 * Runs the real story writer over a set of notes and writes the results as
 * JSON. story_eval.py drives this; it is not meant to be run on its own.
 *
 *   tsx scripts/story-eval/run-stories.mts <cases.json> <out.json> [--reps N] [--only id,id]
 *
 * It calls generateLearningStory directly, the same function /api/generate
 * calls, so every guard, rescue rewrite and fallback in the pipeline runs
 * exactly as it does in production. Nothing is saved anywhere.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { generateLearningStory } from "@/lib/ai/generate";

type Case = {
  id: string;
  framework: "AU" | "NZ";
  ageGroup?: string;
  childName?: string;
  observations: string;
  educatorNames?: string[];
  tone?: string;
  depth?: string;
};

const [casesPath, outPath, ...rest] = process.argv.slice(2);
if (!casesPath || !outPath) {
  console.error("usage: run-stories.mts <cases.json> <out.json> [--reps N] [--only id,id]");
  process.exit(2);
}
const flag = (name: string) => {
  const index = rest.indexOf(name);
  return index >= 0 ? rest[index + 1] : undefined;
};
const reps = Math.max(1, Number(flag("--reps") ?? 1));
const only = flag("--only")?.split(",").map((id) => id.trim()).filter(Boolean);
const concurrency = Math.max(1, Number(flag("--concurrency") ?? 4));

const cases = (JSON.parse(readFileSync(casesPath, "utf8")) as Case[]).filter((c) => !only || only.includes(c.id));
const jobs = cases.flatMap((c) => Array.from({ length: reps }, (_, rep) => ({ c, rep })));
const results: unknown[] = new Array(jobs.length);

let next = 0;
async function worker() {
  while (next < jobs.length) {
    const index = next++;
    const { c, rep } = jobs[index];
    const started = Date.now();
    try {
      const result = await generateLearningStory({
        observations: c.observations,
        ageGroup: c.ageGroup,
        childName: c.childName,
        framework: c.framework,
        educatorNames: c.educatorNames,
        tone: c.tone as never,
        depth: c.depth as never,
      });
      results[index] = { id: c.id, rep, ms: Date.now() - started, ok: true, result };
      process.stderr.write(`  ${c.id}#${rep} ${Math.round((Date.now() - started) / 1000)}s quality=${(result as { storyQuality?: { score?: number } }).storyQuality?.score ?? "?"}\n`);
    } catch (error) {
      results[index] = { id: c.id, rep, ms: Date.now() - started, ok: false, error: String(error) };
      process.stderr.write(`  ${c.id}#${rep} FAILED ${String(error).slice(0, 120)}\n`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), model: process.env.OPENAI_STORY_MODEL || "gpt-5.5", results }, null, 2));
