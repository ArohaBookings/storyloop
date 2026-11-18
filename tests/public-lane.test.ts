import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  KEEP_AUTO_MAX_AGE_MS,
  KEEP_STORY_MAX_AGE_MS,
  cleanKeptStatement,
  keptDraftUsable,
  keptStatementText,
  keptStrategyLabel,
} from "../lib/keep-story";
import { EXIT_REASONS, EXIT_SURFACE_PATH, cleanExitFeedback, shouldShowExitQuestion } from "../lib/exit-feedback";
import { PLAN_DEFINITIONS } from "../lib/plans";
import { SEO_PAGES } from "../lib/seo-pages";
import { SEO_DEEP_DIVES } from "../lib/seo-deep-dives";

const NOW = Date.parse("2026-11-18T03:00:00Z");
const draft = {
  framework: "VEYLDF",
  mode: "transition",
  outcomes: [
    { outcome: "Identity", seen: "Mia asked to hold the gate for the younger ones.", strategy: "Give Mia a job on the first morning.", gap: "" },
    { outcome: "Wellbeing", seen: "", strategy: "", gap: "Nothing about rest yet." },
  ],
  checks: ["Check the date of the excursion."],
  at: NOW - 60_000,
};

test("a kept statement draft is trusted only when it looks like the drafter's own output", () => {
  const clean = cleanKeptStatement(draft, NOW);
  assert.ok(clean);
  assert.equal(clean.outcomes.length, 2);
  assert.equal(cleanKeptStatement({ ...draft, framework: "XX" }, NOW), null);
  assert.equal(cleanKeptStatement({ ...draft, mode: "story" }, NOW), null);
  assert.equal(cleanKeptStatement({ ...draft, at: NOW - KEEP_STORY_MAX_AGE_MS - 1 }, NOW), null);
  assert.equal(cleanKeptStatement({ ...draft, at: NOW + 3_600_000 }, NOW), null);
  // Nothing seen anywhere: there is nothing worth keeping.
  assert.equal(cleanKeptStatement({ ...draft, outcomes: [draft.outcomes[1]] }, NOW), null);
  // Only the draft is kept, never extra fields such as the notes it came from.
  assert.equal("notes" in (cleanKeptStatement({ ...draft, notes: "Mia, 4, said..." }, NOW) ?? {}), false);
  assert.equal(cleanKeptStatement({ ...draft, outcomes: Array.from({ length: 20 }, () => draft.outcomes[0]) }, NOW)?.outcomes.length, 8);
});

test("the kept statement copies exactly as the drafter's Copy all does", () => {
  const clean = cleanKeptStatement(draft, NOW)!;
  assert.equal(
    keptStatementText(clean),
    "Identity\nWhat I saw: Mia asked to hold the gate for the younger ones.\nStrategy for the Prep teacher: Give Mia a job on the first morning.\n\nWellbeing\nNot in my notes yet: Nothing about rest yet.",
  );
  assert.equal(keptStrategyLabel("TW", "transition"), "Strategy for the new entrant teacher");
  assert.equal(keptStrategyLabel("EYLF", "summary"), "Next step");
});

test("a draft kept without a tap reaches an account only through the signup page, and only while fresh", () => {
  const tapped = { at: NOW - 3 * 86_400_000 };
  const auto = { at: NOW - 60_000, auto: true };
  // Tapped "Keep": as before, for the full week (the week itself is checked by the clean functions).
  assert.equal(keptDraftUsable(tapped, NOW), true);
  // Auto: shown on the signup page, never imported until the signup page confirmed it.
  assert.equal(keptDraftUsable(auto, NOW, true), true);
  assert.equal(keptDraftUsable(auto, NOW, false), false);
  // A stale auto draft (a shared tablet) is gone for everyone.
  assert.equal(keptDraftUsable({ at: NOW - KEEP_AUTO_MAX_AGE_MS - 1, auto: true }, NOW, true), false);
  assert.equal(keptDraftUsable(null, NOW, true), false);
  assert.equal(keptDraftUsable([], NOW, true), false);
});

test("the exit question is asked once per visitor, on the first page she reaches it", () => {
  assert.equal(shouldShowExitQuestion(null, false, "pricing", false), true);
  // Seen on /pricing this visit: it stays there (a reload keeps her half-made answer), and nowhere else.
  assert.equal(shouldShowExitQuestion("pricing", false, "pricing", true), true);
  assert.equal(shouldShowExitQuestion("pricing", false, "features", true), false);
  // A later visit: gone everywhere.
  assert.equal(shouldShowExitQuestion("pricing", false, "pricing", false), false);
  assert.equal(shouldShowExitQuestion("about", false, "for_centres", false), false);
  // Answered: never again.
  assert.equal(shouldShowExitQuestion(null, true, "about", false), false);
});

test("the exit question's new pages are known surfaces with public paths, and its labels point at no other product", () => {
  for (const surface of ["about", "pricing", "features", "for_centres"] as const) {
    assert.ok(cleanExitFeedback({ reason: "price", surface }), surface);
    assert.match(EXIT_SURFACE_PATH[surface], /^\/[a-z-]+$/);
  }
  for (const gone of ["home", "guide", "signup"]) assert.equal(cleanExitFeedback({ reason: "price", surface: gone }), null);
  const allusion = /\b(another|other) (ai|app|tool|product)|story ?park|educa|chat ?gpt|copilot|gemini/i;
  for (const reason of EXIT_REASONS) assert.doesNotMatch(reason.label, allusion, reason.key);
});

test("public plan lines and the centre page name no other platform and promise only what the code does", () => {
  const rivals = /\b(story ?park|educa|kinderloop|brightwheel|xplor|playground|mana app|chat ?gpt|copilot|gemini)\b/i;
  for (const plan of PLAN_DEFINITIONS) {
    for (const line of [...(plan.highlights ?? []), ...(plan.features ?? [])]) {
      assert.doesNotMatch(line, rivals, `${plan.key}: ${line}`);
      assert.doesNotMatch(line, /documentation platforms/i, `${plan.key}: ${line}`);
    }
  }
  // The meta description keeps its evergreen "at least 30 days free" (lib/offer-wording.ts); the page itself is checked.
  const { description: _meta, ...page } = SEO_PAGES["for-centres"];
  const centres = JSON.stringify(page) + JSON.stringify(SEO_DEEP_DIVES["for-centres"]);
  assert.doesNotMatch(centres, rivals);
  // The centre tools read each educator's own stories; no team-wide child view exists (fault noted 17 Nov 2026).
  assert.doesNotMatch(centres, /you can see which children have gone unnoticed/i);
  assert.doesNotMatch(centres, /counts what your team already saved/i);
  assert.doesNotMatch(centres, /not another platform/i);
  assert.doesNotMatch(centres, /works (beside|alongside)/i);
  // One free period, in the shared wording: no stray "free month".
  assert.doesNotMatch(centres, /free month|month simply ends|30 days free/i);
});

test("the guides that open on the drafter are exactly the four transition guides and the end-of-year guide", () => {
  const source = readFileSync(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("const HERO_DRAFTER_SLUGS"), source.indexOf("]);", source.indexOf("const HERO_DRAFTER_SLUGS")));
  const slugs = [...block.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(slugs, [
    "end-of-year-learning-summary",
    "nsw-transition-to-school-statement",
    "qld-kindergarten-transition-statement",
    "tlds-examples",
    "transition-to-school-statement",
  ]);
  for (const slug of slugs) assert.ok(SEO_PAGES[slug], slug);
});
