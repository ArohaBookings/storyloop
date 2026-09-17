import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { autoWritableTopics, GUIDE_TOPICS, unsupportedCitations } from "../lib/blog-topics";

test("the scheduled writer never takes regulatory or already-covered topics", () => {
  const slugs = autoWritableTopics([]).map((t) => t.slug);
  for (const blocked of [
    "ero-documentation-evidence",
    "acecqa-documentation-requirements",
    "transition-to-school-report",
    "storypark-alternatives-comparison",
    "kowhiti-whakapae-explained",
  ]) {
    assert.ok(!slugs.includes(blocked), `${blocked} must be manual only`);
  }
  assert.ok(slugs.length >= 10, "there must still be a real backlog to publish from");
  assert.deepEqual(autoWritableTopics(GUIDE_TOPICS.map((t) => t.slug)), []);
});

test("a draft citing a law or regulation its facts do not support is caught", () => {
  assert.deepEqual(unsupportedCitations("Under Regulation 168 every service must keep photos for a year."), ["Regulation 168"]);
  assert.deepEqual(unsupportedCitations("The Privacy Act 2020 says you must ask twice."), ["Privacy Act 2020"]);
  assert.deepEqual(unsupportedCitations("This meets Element 1.3.1 of the NQS."), ["Element 1.3.1"]);
  assert.deepEqual(unsupportedCitations("Licensing criterion 12 requires a portfolio."), ["criterion 12"]);

  assert.deepEqual(unsupportedCitations("Under the Education and Training Act 2020 you must keep records."), ["Training Act 2020"]);

  // Supported by the topic's verified facts: allowed.
  const facts = ["ACECQA Guide to the NQF, Element 1.3.1: images only on service-supplied devices."];
  assert.deepEqual(unsupportedCitations("ACECQA's guidance for Element 1.3.1 is clear about devices.", facts), []);

  // Ordinary writing is not a citation.
  assert.deepEqual(
    unsupportedCitations("Section your notes by child. Act on what you notice, and in 2 weeks revisit it. Standard practice is to ask families."),
    [],
  );
});

test("every topic with facts says where they came from", () => {
  for (const topic of GUIDE_TOPICS.filter((t) => t.facts?.length)) {
    for (const fact of topic.facts ?? []) {
      assert.ok(/\(|Do not cite|follow the service/i.test(fact), `${topic.slug}: fact without a stated source: ${fact.slice(0, 60)}`);
    }
  }
});

test("the blog cron is scheduled and publishes on GET, which is how Vercel calls it", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  const blog = config.crons.find((c) => c.path === "/api/cron/blog");
  assert.ok(blog, "blog cron must be scheduled");
  assert.equal(blog.schedule.split(" ").length, 5);
  const route = readFileSync(new URL("../app/api/cron/blog/route.ts", import.meta.url), "utf8");
  assert.match(route, /export async function GET[\s\S]*publishNext\(\)/);
  assert.match(route, /dryRun/);
});
