import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EVENTS, sanitizeEventMetadata } from "../lib/analytics/events";
import { STATEMENT_GUIDE_FORMS } from "../lib/statement-guide-forms";
import {
  STATEMENT_TO_STORY_HREF,
  canCarryStatementNote,
  carriedFirstName,
  statementToStoryLabel,
} from "../lib/statement-to-story";

// B8 (25 Nov 2026): from a statement draft to the weekly learning story.

const NOTE = "Ari can write his name, joins in at mat time, and asks for help with buttons. He loves the sandpit with Tui.";
const OTHER_PRODUCTS = /chatgpt|copilot|gemini|claude|storypark|educa|kinderloop|xplor|brightwheel|seesaw|mana\b/i;

test("the button names the child when there is a first name, and never shows a surname or junk", () => {
  assert.equal(statementToStoryLabel("Mia"), "Write Mia's learning story from the same note");
  assert.equal(statementToStoryLabel("  Mia Smith "), "Write Mia's learning story from the same note");
  assert.equal(statementToStoryLabel(""), "Write a learning story from the same note");
  assert.equal(statementToStoryLabel("<script>"), "Write a learning story from the same note");
  assert.equal(carriedFirstName("Tāne"), "Tāne");
  assert.equal(carriedFirstName("O'Neill"), "O'Neill");
  assert.equal(carriedFirstName(null), "");
});

test("it shows only when the note can really be carried: her own note, 20 to 2000 characters", () => {
  assert.equal(canCarryStatementNote(NOTE, false), true);
  assert.equal(canCarryStatementNote(NOTE, true), false, "the sample child is not hers");
  assert.equal(canCarryStatementNote("too short", false), false);
  assert.equal(canCarryStatementNote("x".repeat(2001), false), false);
});

test("the link carries a flag only: no note, no name in the address", () => {
  assert.equal(STATEMENT_TO_STORY_HREF, "/generate?carry=statement");
});

test("the tap's event is on the list and keeps no text", () => {
  assert.ok(EVENTS.app_statement_to_story);
  assert.deepEqual(sanitizeEventMetadata("app_statement_to_story", { mode: "transition", named: true, note: NOTE, childName: "Mia" }), { mode: "transition", named: true });
});

test("the five statement guides each point the weekly writer to a learning-story page for her country", () => {
  for (const [slug, form] of Object.entries(STATEMENT_GUIDE_FORMS)) {
    const line = `${form.weekly.lead} ${form.weekly.links.map((link) => link.label).join(" or ")}.`;
    assert.doesNotMatch(line, /—|–/, `${slug}: no dashes`);
    assert.doesNotMatch(line, OTHER_PRODUCTS, `${slug}: no other product`);
    assert.ok(line.split(/\s+/).length <= 20, `${slug}: short`);
    for (const link of form.weekly.links) assert.match(link.href, /^\/(eylf|te-whariki)-learning-stories$/);
  }
  assert.deepEqual(STATEMENT_GUIDE_FORMS["end-of-year-learning-summary"].weekly.links.map((l) => l.href), ["/te-whariki-learning-stories", "/eylf-learning-stories"]);
  assert.deepEqual(STATEMENT_GUIDE_FORMS["tlds-examples"].weekly.links.map((l) => l.href), ["/eylf-learning-stories"]);
});

test("the story screen takes the carried note once, and never over her own typing or into the protected note box code", () => {
  const page = readFileSync("app/(app)/generate/page.tsx", "utf8");
  assert.match(page, /takeCarriedStatement\(\)/);
  assert.match(page, /carried && !observationsRef\.current\.trim\(\)/);
  assert.match(page, /!keptStoryAtLoad\.current && !carried &&/, "no first-story wizard over her carried note");
});
