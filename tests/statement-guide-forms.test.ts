import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { STATEMENT_GUIDE_FORMS } from "../lib/statement-guide-forms";

const HERO_SLUGS = [...readFileSync("app/[slug]/page.tsx", "utf8").match(/const HERO_DRAFTER_SLUGS = new Set\(\[([\s\S]*?)\]\)/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const OTHER_PRODUCTS = /chatgpt|copilot|gemini|claude|storypark|educa|kinderloop|xplor|brightwheel|seesaw|mana\b/i;

test("every statement guide with the drafter on top names its form and says what StoryLoop does with it", () => {
  assert.equal(HERO_SLUGS.length, 5);
  for (const slug of HERO_SLUGS) {
    const form = STATEMENT_GUIDE_FORMS[slug];
    assert.ok(form, `${slug} has a form`);
    assert.ok(form.formName.length > 3);
    const words = form.ownedSentence.split(/\s+/).length;
    assert.ok(words < 30, `${slug}: ${words} words`);
    assert.match(form.ownedSentence, /^StoryLoop drafts your .+ from your own notes\. You check it, then copy it into .+\.$/);
    assert.doesNotMatch(form.ownedSentence + form.formName, /—|–/, "no dashes");
    assert.doesNotMatch(form.ownedSentence, OTHER_PRODUCTS, "no other product named");
  }
});
