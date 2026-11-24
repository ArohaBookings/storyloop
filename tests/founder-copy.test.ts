import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOUNDER_FACTS, founderCountLine } from "../lib/founder-facts";
import { rivalNames } from "../lib/blog-topics";

const aboutSource = readFileSync(new URL("../app/about/page.tsx", import.meta.url), "utf8");
const founderHtml = readFileSync(new URL("../components/landing/Founder.tsx", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'");

test("the founder section and About use no em dash and name no other product", () => {
  for (const [name, body] of [["Founder", text(founderHtml)], ["About", aboutSource.replace(/\/\/.*$|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/gm, "")]] as const) {
    assert.ok(!body.includes("—"), `${name} has an em dash`);
    assert.deepEqual(rivalNames(body), [], `${name} names another product`);
  }
});

test("the counts come from one dated file and add up", () => {
  assert.match(FOUNDER_FACTS.countedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(FOUNDER_FACTS.teWharikiStories + FOUNDER_FACTS.eylfStories, FOUNDER_FACTS.learningStoriesWritten);
  assert.ok(founderHtml.includes("{founderCountLine()}"));
  assert.match(founderCountLine(), /^Since May, \d+ educators have written \d+ learning stories with it: \d+ for Te Whāriki and \d+ for the EYLF\.$/);
  assert.ok(aboutSource.includes("founderCountLine("));
  // Never typed into a page.
  for (const n of [FOUNDER_FACTS.learningStoriesWritten, FOUNDER_FACTS.teWharikiStories]) {
    assert.ok(!aboutSource.includes(String(n)), `About types ${n} by hand`);
  }
});

test("the age is said once, on About only", () => {
  assert.doesNotMatch(text(founderHtml), /\b(19|20)\b(?! for)/);
  assert.equal((aboutSource.match(/I&apos;m 20|I am 20|Leo, 20|when I was 19/g) ?? []).length, 1);
});
